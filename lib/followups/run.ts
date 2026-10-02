import { Prisma } from '@prisma/client';
import { resolveAgreementEventDate, torontoDateKey } from '@/lib/dates';
import {
  GOOGLE_REVIEW_URL_ONTARIO,
  planFollowups,
  type FollowupAgreement,
} from '@/lib/followups/rules';
import { alertHeldGallery, sendGalleryEmail, sendReviewRequest, type FollowupSendResult } from '@/lib/followups/send';
import { prisma } from '@/lib/prisma';

export const followupSelect = {
  id: true,
  status: true,
  archived: true,
  cancelledAt: true,
  paymentStatus: true,
  galleryLink: true,
  galleryLinks: true,
  galleryEmailSentAt: true,
  reviewRequestSentAt: true,
  followUpsPaused: true,
  reviewReceived: true,
  galleryHeldAlertAt: true,
  client: { select: { firstName: true, lastName: true, eventDate: true } },
  event: { select: { eventDate: true } },
} satisfies Prisma.AgreementSelect;

export type FollowupRecord = Prisma.AgreementGetPayload<{ select: typeof followupSelect }>;

/** Active agreements that still have a follow-up to send. Rules decide the rest. */
export async function loadFollowupCandidates(): Promise<FollowupRecord[]> {
  return prisma.agreement.findMany({
    where: {
      status: { not: 'CANCELLED' },
      archived: false,
      cancelledAt: null,
      OR: [{ galleryEmailSentAt: null }, { reviewRequestSentAt: null }],
    },
    select: followupSelect,
  });
}

export type FollowupRunItem = {
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
  const plan = planFollowups(records as FollowupAgreement[], now, launchKey);
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
