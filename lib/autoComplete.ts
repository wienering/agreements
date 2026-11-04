import { Prisma } from '@prisma/client';
import { logAgreementActivity } from '@/lib/activityLog';
import { resolveAgreementEventDate, torontoDateKey, torontoStartOfTodayUtc } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { setEventStatus } from '@/lib/events/status';

/**
 * Automatic Completed: a SIGNED agreement moves to COMPLETED on the Toronto day after its event.
 * Status only. Nothing is sent, and DRAFT or SENT agreements are never touched.
 */

export type AutoCompleteCandidate = {
  id: string;
  status: string;
  cancelledAt: Date | null;
  event?: { eventDate: Date | null } | null;
  client: { eventDate: Date | null };
};

/** True once the event's Toronto day has passed. Agreements without an event date never qualify. */
export function isDueForAutoComplete(a: AutoCompleteCandidate, now: Date): boolean {
  if (a.status !== 'SIGNED' || a.cancelledAt) return false;
  const eventDate = resolveAgreementEventDate(a);
  if (!eventDate) return false;
  return torontoDateKey(eventDate) < torontoDateKey(now);
}

const autoCompleteSelect = {
  id: true,
  status: true,
  cancelledAt: true,
  client: { select: { firstName: true, lastName: true, eventDate: true } },
  event: { select: { eventDate: true } },
} satisfies Prisma.AgreementSelect;

export type AutoCompleteItem = { agreementId: string; clientName: string; eventDateKey: string; result: string };

export type AutoCompleteSummary = { dryRun: boolean; completed: AutoCompleteItem[] };

/** Only the production deployment changes statuses. Everywhere else is a dry run. */
export function autoCompleteDryRun(vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return vercelEnv !== 'production';
}

/**
 * Events move to Completed the Toronto day after they happen; their signed agreements follow
 * (lib/events/status.ts). Older signed agreements with no event keep the agreement-only rule.
 * `agreementId` in the summary is the event id for event rows.
 */
export async function runAutoComplete(options: { now: Date; dryRun: boolean }): Promise<AutoCompleteSummary> {
  const { now, dryRun } = options;
  const startOfToday = torontoStartOfTodayUtc(now);
  const summary: AutoCompleteSummary = { dryRun, completed: [] };

  const events = await prisma.event.findMany({
    where: { status: 'UPCOMING', cancelledAt: null, eventDate: { lt: startOfToday } },
    select: { id: true, eventDate: true, client: { select: { firstName: true, lastName: true } } },
  });
  for (const event of events) {
    const candidate = { id: event.id, status: 'SIGNED', cancelledAt: null, event: { eventDate: event.eventDate }, client: { eventDate: null } };
    if (!isDueForAutoComplete(candidate, now)) continue;
    const item = {
      agreementId: event.id,
      clientName: `${event.client.firstName} ${event.client.lastName}`.trim(),
      eventDateKey: torontoDateKey(event.eventDate as Date),
    };
    if (dryRun) {
      summary.completed.push({ ...item, result: 'would complete event' });
      continue;
    }
    const change = await setEventStatus(event.id, 'COMPLETED', { now, activityType: 'AUTO_COMPLETED' });
    summary.completed.push({ ...item, result: change ? 'event completed' : 'skipped: status changed' });
  }

  // Coarse filter on the event date; isDueForAutoComplete settles the Toronto day.
  const records = await prisma.agreement.findMany({
    where: {
      status: 'SIGNED',
      cancelledAt: null,
      eventId: null,
      client: { eventDate: { lt: startOfToday } },
    },
    select: autoCompleteSelect,
  });

  for (const record of records) {
    if (!isDueForAutoComplete(record, now)) continue;
    const eventDateKey = torontoDateKey(resolveAgreementEventDate(record) as Date);
    const item = {
      agreementId: record.id,
      clientName: `${record.client.firstName} ${record.client.lastName}`.trim(),
      eventDateKey,
    };

    if (dryRun) {
      summary.completed.push({ ...item, result: 'would complete' });
      continue;
    }

    // Conditional on SIGNED, so a change made since the read is never overwritten.
    const { count } = await prisma.agreement.updateMany({
      where: { id: record.id, status: 'SIGNED' },
      data: { status: 'COMPLETED' },
    });
    if (count === 1) {
      await logAgreementActivity(record.id, 'AUTO_COMPLETED', { eventDate: eventDateKey });
      summary.completed.push({ ...item, result: 'completed' });
    } else {
      summary.completed.push({ ...item, result: 'skipped: status changed' });
    }
  }
  return summary;
}
