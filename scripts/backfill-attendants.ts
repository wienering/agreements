/**
 * Creates an Attendant for each backdrop-tool ID found in backdrop link URLs and links
 * each backdrop link to it. Safe to re-run.
 *
 * Dry run (default, read-only; works before the migration is applied):
 *   npx tsx scripts/backfill-attendants.ts
 * Apply (requires the 20261002174500_attendant_records migration):
 *   npx tsx scripts/backfill-attendants.ts --apply
 *
 * Use the direct (non-pooler) database connection, as described in docs/DATABASE.md.
 */
import { PrismaClient } from '@prisma/client';
import {
  planAttendantBackfill,
  type AttendantBackfillPlan,
  type BackfillAttendant,
  type BackfillLink,
} from '../lib/attendants/backfill';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function migrationApplied(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ table_exists: boolean; column_exists: boolean }[]>(
    `SELECT to_regclass('public."Attendant"') IS NOT NULL AS table_exists,
            EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'BackdropLink' AND column_name = 'attendantId'
            ) AS column_exists`,
  );
  return Boolean(rows[0]?.table_exists && rows[0]?.column_exists);
}

async function readState(applied: boolean): Promise<{ links: BackfillLink[]; attendants: BackfillAttendant[] }> {
  const links = applied
    ? await prisma.$queryRawUnsafe<BackfillLink[]>(
        'SELECT id, name, url, "attendantId" FROM "BackdropLink" ORDER BY "displayOrder", name',
      )
    : (
        await prisma.$queryRawUnsafe<Omit<BackfillLink, 'attendantId'>[]>(
          'SELECT id, name, url FROM "BackdropLink" ORDER BY "displayOrder", name',
        )
      ).map((l) => ({ ...l, attendantId: null }));
  const attendants = applied
    ? await prisma.$queryRawUnsafe<BackfillAttendant[]>('SELECT id, name, "externalId" FROM "Attendant"')
    : [];
  return { links, attendants };
}

function printPlan(plan: AttendantBackfillPlan, linkCount: number) {
  console.log(`Backdrop links: ${linkCount}`);
  console.log('');
  console.log(`Attendants to create (${plan.create.length}), all active:`);
  for (const a of plan.create) console.log(`  + ${a.name}  [${a.externalId}]`);
  console.log('');
  console.log(`Backdrop links to connect (${plan.link.length}):`);
  for (const l of plan.link) console.log(`  ${l.linkName} -> attendant ${l.externalId}`);
  console.log('');
  console.log(`Already connected (${plan.alreadyLinked.length}):`);
  for (const l of plan.alreadyLinked) console.log(`  ${l.linkName}`);
  console.log('');
  console.log(`Needs a decision, left unchanged (${plan.problems.length}):`);
  for (const p of plan.problems) console.log(`  ${p.linkName}: ${p.reason}`);
}

async function main() {
  const applied = await migrationApplied();
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (no changes)'}`);
  console.log(`Migration applied: ${applied ? 'yes' : 'no'}`);
  console.log('');

  const { links, attendants } = await readState(applied);
  const plan = planAttendantBackfill(links, attendants);
  printPlan(plan, links.length);

  if (!apply) return;
  if (!applied) {
    throw new Error('Apply the 20261002174500_attendant_records migration before running with --apply.');
  }

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    for (const a of plan.create) {
      await tx.attendant.create({ data: { name: a.name, externalId: a.externalId, active: true } });
      created++;
    }
    const idsByExternalId = new Map(
      (await tx.attendant.findMany({ select: { id: true, externalId: true } })).map((a) => [a.externalId, a.id]),
    );
    let connected = 0;
    for (const l of plan.link) {
      const attendantId = idsByExternalId.get(l.externalId);
      if (!attendantId) throw new Error(`No attendant for ${l.externalId}; nothing was changed.`);
      await tx.backdropLink.update({ where: { id: l.linkId }, data: { attendantId } });
      connected++;
    }
    return { created, connected };
  });

  console.log('');
  console.log(`Created ${result.created} attendants and connected ${result.connected} backdrop links.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
