/**
 * Lists signed agreements whose mergedHtml snapshot likely baked in a UTC off-by-one
 * agreement.date (signed when Toronto calendar day ≠ UTC calendar day).
 *
 * Run: npx tsx scripts/list-affected-agreement-dates.ts
 */
import { PrismaClient } from '@prisma/client';
import { formatDateTimeToronto, isLikelyUtcOffByOneSnapshot, torontoDateKey, utcDateKey } from '../lib/dates';

const prisma = new PrismaClient();

async function main() {
  const agreements = await prisma.agreement.findMany({
    where: {
      signedAt: { not: null },
      mergedHtml: { not: null },
      status: { in: ['SIGNED', 'COMPLETED'] },
    },
    select: {
      id: true,
      signedAt: true,
      mergedHtml: true,
      client: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { signedAt: 'desc' },
  });

  const affected = agreements.filter((a) => a.signedAt && isLikelyUtcOffByOneSnapshot(a.signedAt));

  console.log('# Affected agreement.date snapshots (UTC off-by-one at sign time)\n');
  console.log(`Generated: ${formatDateTimeToronto(new Date())}\n`);
  console.log(`Total signed with mergedHtml: ${agreements.length}`);
  console.log(`Likely affected: ${affected.length}\n`);

  if (affected.length === 0) {
    console.log('No affected agreements found.');
    return;
  }

  console.log('| Agreement ID | Client | Signed At (Toronto) | UTC date (wrong) | Toronto date (correct) |');
  console.log('|--------------|--------|---------------------|------------------|------------------------|');

  for (const row of affected) {
    const signedAt = row.signedAt!;
    const client = `${row.client.firstName} ${row.client.lastName}`.trim();
    console.log(
      `| ${row.id} | ${client} | ${formatDateTimeToronto(signedAt)} | ${utcDateKey(signedAt)} | ${torontoDateKey(signedAt)} |`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
