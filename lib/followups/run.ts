import { Prisma } from '@prisma/client';
import { resolveAgreementEventDate, torontoDateKey } from '@/lib/dates';
import {
  GOOGLE_REVIEW_URL_ONTARIO,
  planFollowups,
  type FollowupAgreement,
} from '@/lib/followups/rules';
import { alertHeldGallery, sendGalleryEmail, sendReviewRequest, type FollowupSendResult } from '@/lib/followups/send';
import { prisma } from '@/lib/prisma';
import { bookingStatusOf } from '@/lib/events/booking';

export const followupSelect = {
  id: true,
  status: true,
  archived: true,
  cancelledAt: true,
  paymentStatus: true,
  galleryLinks: true,
  galleryEmailSentAt: true,
  reviewRequestSentAt: true,
  followUpsPaused: true,
  reviewReceived: true,
  galleryHeldAlertAt: true,
  eventDate: true,
  client: { select: { firstName: true, lastName: true } },
} satisfies Prisma.EventSelect;

type FollowupEventRow = Prisma.EventGetPayload<{ select: typeof followupSelect }>;

/** An event in the shape the follow-up rules read. `id` is the event id. */
export type FollowupRecord = FollowupAgreement & { client: { firstName: string; lastName: string; eventDate: Date | null } };

export function toFollowupRecord(row: FollowupEventRow): FollowupRecord {
  return {
    id: row.id,
    status: bookingStatusOf(row.status),
    archived: row.archived,
    cancelledAt: row.cancelledAt,
    paymentStatus: row.paymentStatus,
    galleryLink: null,
    galleryLinks: row.galleryLinks,
    galleryEmailSentAt: row.galleryEmailSentAt,
    reviewRequestSentAt: row.reviewRequestSentAt,
    followUpsPaused: row.followUpsPaused,
    reviewReceived: row.reviewReceived,
    galleryHeldAlertAt: row.galleryHeldAlertAt,
    event: { eventDate: row.eventDate },
    client: { firstName: row.client.firstName, lastName: row.client.lastName, eventDate: null },
  };
}

/** Active events that still have a follow-up to send. Rules decide the rest. */
export async function loadFollowupCandidates(): Promise<FollowupRecord[]> {
  const rows = await prisma.event.findMany({
    where: {
      status: { not: 'CANCELLED' },
      archived: false,
      cancelledAt: null,
      OR: [{ galleryEmailSentAt: null }, { reviewRequestSentAt: null }],
    },
    select: followupSelect,
  });
  return rows.map(toFollowupRecord);
}

export type FollowupRunItem = {
  /** The event id. Named agreementId for the dry-run card, which predates events. */
  agreementId: string;
  clientName: string;
  eventDateKey: string | null;
  result: string;
  detail?: string;
};

export type FollowupRunSummary = {
  dryRun: boolean;
  ranAt: string;
  launchDate: string;
  galleryEmails: FollowupRunItem[];
  reviewRequests: FollowupRunItem[];
  held: FollowupRunItem[];
};

function itemFor(record: FollowupRecord, result: string, detail?: string): FollowupRunItem {
  const eventDate = resolveAgreementEventDate(record);
  return {
    agreementId: record.id,
    clientName: `${record.client.firstName} ${record.client.lastName}`.trim(),
    eventDateKey: eventDate ? torontoDateKey(eventDate) : null,
    result,
    ...(detail ? { detail } : {}),
  };
}

function describeResult(result: FollowupSendResult): { result: string; detail?: string } {
  switch (result.status) {
    case 'sent':
      return { result: 'sent', detail: result.to };
    case 'dry_run':
      return { result: 'would send', detail: result.to };
    case 'refused':
    case 'failed':
      return { result: result.status, detail: result.reason };
  }
}

/** Today's follow-ups: gallery emails, review requests and held galleries. */
export async function runFollowups(options: {
  now: Date;
  dryRun: boolean;
  launchKey: string;
}): Promise<FollowupRunSummary> {
  const { now, dryRun, launchKey } = options;
  const records = await loadFollowupCandidates();
  const plan = planFollowups(records, now, launchKey);
  const byId = new Map(records.map((r) => [r.id, r]));

  const summary: FollowupRunSummary = {
    dryRun,
    ranAt: now.toISOString(),
    launchDate: launchKey,
    galleryEmails: [],
    reviewRequests: [],
    held: [],
  };

  for (const a of plan.galleryEmails) {
    const record = byId.get(a.id)!;
    const result = await sendGalleryEmail(a.id, { trigger: 'auto', dryRun, now });
    const { result: label, detail } = describeResult(result);
    summary.galleryEmails.push(itemFor(record, label, detail));
  }

  for (const a of plan.reviewRequests) {
    const record = byId.get(a.id)!;
    const result = await sendReviewRequest(a.id, {
      trigger: 'auto',
      dryRun,
      now,
      reviewUrl: GOOGLE_REVIEW_URL_ONTARIO,
    });
    const { result: label, detail } = describeResult(result);
    summary.reviewRequests.push(itemFor(record, label, detail));
  }

  for (const { agreement, alert } of plan.held) {
    const record = byId.get(agreement.id)!;
    if (!alert) {
      summary.held.push(itemFor(record, 'held', 'already alerted'));
      continue;
    }
    const outcome = await alertHeldGallery(record, { dryRun, now });
    summary.held.push(itemFor(record, 'held', outcome === 'dry_run' ? 'would alert' : outcome.replace('_', ' ')));
  }

  return summary;
}
