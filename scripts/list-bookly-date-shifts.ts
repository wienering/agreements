/**
 * Lists events whose eventDate is exactly 00:00:00.000 UTC.
 *
 * Date-only Bookly bookings (for example 2026-06-15) used to be parsed with
 * `new Date('YYYY-MM-DD')`, which stores UTC midnight. In America/Toronto that
 * instant is the previous evening, so the calendar day shown is one day early.
 * The original booking date is the UTC calendar day of that instant.
 *
 * Admin events are stored as a Toronto wall-clock time, so midnight in Toronto
 * is 04:00 or 05:00 UTC and does not appear here. An admin time of 8:00 PM EDT
 * or 7:00 PM EST is also 00:00 UTC; review those rows before changing anything.
 *
 * Read-only. This script does not write to the database.
 *
 * Run: npx tsx scripts/list-bookly-date-shifts.ts
 */
import { PrismaClient } from '@prisma/client';
import { formatDateTimeToronto, torontoDateKey, utcDateKey } from '../lib/dates';

const prisma = new PrismaClient();

function isUtcMidnight(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

async function main() {
  const events = await prisma.event.findMany({
    where: { eventDate: { not: null } },
    select: {
      id: true,
      eventDate: true,
      client: { select: { firstName: true, lastName: true } },
    },
    orderBy: { eventDate: 'desc' },
  });

  const affected = events.filter((event) => event.eventDate && isUtcMidnight(event.eventDate));

  console.log('# Bookly date-only shifts (eventDate stored at 00:00 UTC)\n');
  console.log(`Generated: ${formatDateTimeToronto(new Date())}\n`);
  console.log(`Events with an eventDate: ${events.length}`);
  console.log(`Probably affected: ${affected.length}\n`);

  if (affected.length === 0) {
    console.log('No matching events found.');
    return;
  }

  console.log('| Event ID | Client | Stored date | Probably should be |');
  console.log('|----------|--------|-------------|--------------------|');

  for (const row of affected) {
    const stored = row.eventDate!;
    const client = `${row.client.firstName} ${row.client.lastName}`.trim();
    const storedLabel = `${stored.toISOString()} (shows as ${torontoDateKey(stored)} in Toronto)`;
    const probable = utcDateKey(stored);
    console.log(`| ${row.id} | ${client} | ${storedLabel} | ${probable} |`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
