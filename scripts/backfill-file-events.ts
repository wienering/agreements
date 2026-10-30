/**
 * Assigns each existing ClientFile without an event to the client's next event on or after
 * its upload day (see lib/files/eventBackfill.ts). Ambiguous files stay unassigned.
 * Safe to re-run: files that already have an event are never changed.
 *
 * Dry run (default, read-only):
 *   npx tsx scripts/backfill-file-events.ts [--skip=<fileId>,...]
 * Apply:
 *   npx tsx scripts/backfill-file-events.ts [--skip=<fileId>,...] --apply
 *
 * 2026-10-29 run: --skip=cmphcxc500001ju04nxs5zd2j (Eva Vuong's YUSA blank template, assigned by hand)
 *
 * Use the direct (non-pooler) database connection, as described in docs/DATABASE.md.
 */
import { PrismaClient } from '@prisma/client';
import { planFileEventAssignments, type BackfillRule } from '../lib/files/eventBackfill';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const rule: BackfillRule = process.argv.includes('--rule=prior') ? 'prior' : 'next';
// --skip=<fileId>[,<fileId>...] leaves those files unassigned for an admin to handle by hand
const skipIds = new Set(
  process.argv
    .filter((a) => a.startsWith('--skip='))
    .flatMap((a) => a.slice('--skip='.length).split(','))
    .filter(Boolean),
);

function day(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : '(no date)';
}

async function main() {
  const files = await prisma.clientFile.findMany({
    select: {
      id: true,
      clientId: true,
      eventId: true,
      fileName: true,
      createdAt: true,
      client: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const clientIds = [...new Set(files.map((f) => f.clientId))];
  const events = await prisma.event.findMany({
    where: { clientId: { in: clientIds } },
    select: { id: true, clientId: true, eventDate: true, eventName: true },
  });
  const eventById = new Map(events.map((e) => [e.id, e]));

  const plan = planFileEventAssignments(files, events, rule).map((item) =>
    skipIds.has(item.fileId) && item.kind === 'assign'
      ? { fileId: item.fileId, kind: 'unassigned' as const, reason: 'skipped' as const }
      : item,
  );
  console.log(`Rule: ${rule}${skipIds.size ? `, skipping ${[...skipIds].join(', ')}` : ''}\n`);

  for (const [i, item] of plan.entries()) {
    const file = files[i];
    const name = `${file.client.firstName} ${file.client.lastName}`;
    const clientEvents = events
      .filter((e) => e.clientId === file.clientId)
      .map((e) => day(e.eventDate))
      .sort()
      .join(', ');
    let outcome: string;
    if (item.kind === 'unassigned') {
      outcome = `UNASSIGNED (${item.reason})`;
    } else {
      const event = eventById.get(item.eventId);
      outcome = `${item.kind === 'assign' ? 'ASSIGN' : 'KEEP'} -> event ${day(event?.eventDate)}${event?.eventName ? ` "${event.eventName}"` : ''}`;
    }
    console.log(
      `${file.id} | ${name} | ${file.fileName} | uploaded ${day(file.createdAt)} | ${outcome} | client events: ${clientEvents || 'none'}`,
    );
  }

  const counts = plan.reduce<Record<string, number>>((acc, item) => {
    const key = item.kind === 'unassigned' ? `unassigned_${item.reason}` : item.kind;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\nSummary:', { total: plan.length, ...counts });

  const toAssign = plan.filter((p) => p.kind === 'assign');
  if (!apply) {
    console.log(`\nDry run. Re-run with --apply to assign ${toAssign.length} file(s).`);
    return;
  }

  await prisma.$transaction(
    toAssign.map((p) =>
      prisma.clientFile.updateMany({
        where: { id: p.fileId, eventId: null },
        data: { eventId: (p as { eventId: string }).eventId },
      }),
    ),
  );
  console.log(`\nAssigned ${toAssign.length} file(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
