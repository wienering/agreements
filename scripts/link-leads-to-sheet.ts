/**
 * One-time: link the rows on the "Pre-Booking Leads Not Booked" Sheet (working tab only) to CRM leads,
 * so n8n's calls can find them. Safe to re-run.
 *
 * For each row:
 *   - a CRM lead with that lead_id already exists → its status and follow-up fields are refreshed
 *   - otherwise the newest CRM lead with the same email and no lead_id yet → linked and refreshed
 *   - otherwise, if the row is still open (active / paused / blank) → a new CRM lead is created
 *   - otherwise (booked, declined, dead, ...) → skipped; there's nothing left to follow up
 * Nothing is written to the Sheet.
 *
 * Needs the lead_nurturing migration applied, and in .env: DATABASE_URL (direct connection),
 * GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_SHEETS_REFRESH_TOKEN, LEADS_SHEET_ID.
 *
 *   npx tsx scripts/link-leads-to-sheet.ts           report only
 *   npx tsx scripts/link-leads-to-sheet.ts --apply   write to the database
 */
import { PrismaClient, type LeadStatus } from '@prisma/client';
import { readLeadsSheet } from '../lib/googleSheets/client';
import { isOpenStatus, parseFollowUpDate, sheetStatusToLead } from '../lib/leads/status';
import { leadSourceFromPage, parseHours, parseLooseEventDate, splitName } from '../lib/leads/intake';
import { fromTorontoDateTimeLocalInput } from '../lib/dates';

const loadEnvFile = (process as unknown as { loadEnvFile?: (file: string) => void }).loadEnvFile;
for (const file of ['.env', '.env.local']) {
  try {
    loadEnvFile?.(file);
  } catch {
    // file not present
  }
}

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

type Row = Record<string, string>;

function toRows(values: string[][]): Row[] {
  const header = (values[0] ?? []).map((h) => h.trim().toLowerCase());
  return values.slice(1).map((cells) => Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()])));
}

/** "2026-09-09 07:42:26" (Toronto) → Date */
function torontoTimestamp(value: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(value);
  if (!m) return null;
  const d = fromTorontoDateTimeLocalInput(`${m[1]}T${m[2]}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const rows = toRows(await readLeadsSheet()).filter((r) => r['lead_id'] && r['email']);
  const counts = { refreshed: 0, linked: 0, created: 0, skippedClosed: 0 };
  const lines: string[] = [];

  for (const row of rows) {
    const sheetLeadId = row['lead_id'];
    const email = row['email'].toLowerCase();
    const { status, lostReason } = sheetStatusToLead(row['new status']);
    const touches = Number(row['number of follow ups']) || 0;
    const fields = {
      status,
      lostReason,
      contactCount: touches,
      lastContactedAt: torontoTimestamp(row['followup_sent_at']),
      nextFollowUpAt: isOpenStatus(status) ? parseFollowUpDate(row['next follow-up date']) : null,
    };
    const name = row['full_name'] || `${row['first_name']} ${row['last_name']}`.trim() || email;

    let lead = await prisma.lead.findUnique({ where: { sheetLeadId }, select: { id: true, status: true } });
    let action: 'refreshed' | 'linked' | 'created' | 'skippedClosed';

    if (lead) {
      action = 'refreshed';
    } else {
      lead = await prisma.lead.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, sheetLeadId: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
      });
      action = lead ? 'linked' : isOpenStatus(status) ? 'created' : 'skippedClosed';
    }

    counts[action] += 1;
    lines.push(`${action.padEnd(13)} ${name} <${email}>  sheet: "${row['new status'] || '(blank)'}" → ${status}${lostReason ? ` (${lostReason})` : ''}, ${touches} touches`);
    if (!apply || action === 'skippedClosed') continue;

    if (lead) {
      const previous: LeadStatus = lead.status;
      await prisma.lead.update({
        where: { id: lead.id },
        data: { ...fields, sheetLeadId },
      });
      if (previous !== status) {
        await prisma.leadActivity.create({
          data: { leadId: lead.id, kind: 'STATUS_CHANGED', summary: `Set from the Sheet: ${status}`, source: 'backfill' },
        });
      }
    } else {
      const { firstName, lastName } = splitName(row['first_name'], row['last_name'], row['full_name']);
      const submitted = torontoTimestamp(row['submitted_at']) ?? new Date();
      await prisma.lead.create({
        data: {
          ...fields,
          sheetLeadId,
          source: leadSourceFromPage(row['notes']),
          stage: 'QUOTE_REQUESTED',
          firstName: firstName || email,
          lastName,
          email,
          phone: row['phone'] || null,
          eventDate: parseLooseEventDate(row['event_date']),
          eventLocation: row['city'] || null,
          quotePackageHours: parseHours(row['hours']),
          notes: row['event_date'] && !parseLooseEventDate(row['event_date']) ? `Event date as typed: ${row['event_date']}` : null,
          createdAt: submitted,
          activities: {
            create: { kind: 'CREATED', summary: 'Imported from the Sheet', source: 'backfill', occurredAt: submitted },
          },
        },
      });
    }
  }

  console.log(lines.join('\n'));
  console.log(`\n${apply ? 'Applied' : 'Report only (run with --apply to write)'}:`, counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
