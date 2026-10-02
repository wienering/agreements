import { isFullyPaid } from '@/lib/paymentStatus';
import {
  addTorontoCalendarDays,
  parseTorontoCalendarDateKey,
  resolveAgreementEventDate,
  TORONTO_TZ,
  torontoDateKey,
} from '@/lib/dates';

/**
 * Agreements whose event is before this Toronto date are never emailed automatically.
 * Set to the day this feature merges into main; override with FOLLOWUPS_LAUNCH_DATE (YYYY-MM-DD).
 */
export const FOLLOWUPS_DEFAULT_LAUNCH_DATE = '2026-10-02';

/** The review request goes out on the 10am run this many Toronto days after the gallery email. */
export const REVIEW_REQUEST_DELAY_DAYS = 3;

/** Hour of the Toronto day when the follow-up run sends. */
export const FOLLOWUP_RUN_HOUR = 10;

/** The Ontario Google review link, the same one the gallery email uses. */
export const GOOGLE_REVIEW_URL_ONTARIO = 'https://g.page/r/CXHuVoPHi-cIEAI/review';
export const GOOGLE_REVIEW_URL_CALGARY = 'https://g.page/r/CVmM2MGaxRWdEAE/review';

export type FollowupAgreement = {
  id: string;
  status: string;
  archived: boolean;
  cancelledAt: Date | null;
  paymentStatus: string | null;
  galleryLink: string | null;
  galleryLinks: unknown;
  galleryEmailSentAt: Date | null;
  reviewRequestSentAt: Date | null;
  followUpsPaused: boolean;
  reviewReceived: boolean;
  galleryHeldAlertAt: Date | null;
  event?: { eventDate: Date | null } | null;
  client: { eventDate: Date | null };
};

export type FollowupStatus =
  | { kind: 'sent'; at: Date }
  | { kind: 'scheduled'; dateKey: string }
  | { kind: 'held' }
  | { kind: 'paused' }
  | { kind: 'skipped'; reason: string }
  | { kind: 'waiting'; reason: string };

/** The launch cutoff: FOLLOWUPS_LAUNCH_DATE when it's a valid date, otherwise the default. */
export function followupsLaunchDateKey(envValue: string | undefined = process.env.FOLLOWUPS_LAUNCH_DATE): string {
  const trimmed = envValue?.trim();
  return trimmed && parseTorontoCalendarDateKey(trimmed) ? trimmed : FOLLOWUPS_DEFAULT_LAUNCH_DATE;
}

/** Only the production deployment sends follow-ups. Everywhere else is a dry run. */
export function followupsDryRun(vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return vercelEnv !== 'production';
}

/** True during the 10am hour in Toronto. The cron fires at 14:00 and 15:00 UTC; this picks one. */
export function isFollowupRunHour(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: TORONTO_TZ, hour: 'numeric', hourCycle: 'h23' }).format(now),
  );
  return hour === FOLLOWUP_RUN_HOUR;
}

/** Active: not cancelled, not archived. Drafts count. */
export function isActiveForFollowups(a: Pick<FollowupAgreement, 'status' | 'archived' | 'cancelledAt'>): boolean {
  return a.status !== 'CANCELLED' && !a.archived && !a.cancelledAt;
}

export const DRAFT_SKIP_REASON = 'Agreement is a draft';

/**
 * Drafts never get an automatic follow-up: not every agreement is sent to the client.
 * The manual Send now, Resend and Request Google Review buttons still work on drafts.
 */
export function isDraft(a: Pick<FollowupAgreement, 'status'>): boolean {
  return a.status === 'DRAFT';
}

/** Only a fully-paid status (any capitalisation, or the old "Paid"/"Balance Paid") counts as nothing owing. */
export function hasNoBalanceOwing(paymentStatus: string | null): boolean {
  return isFullyPaid(paymentStatus);
}

export function hasGalleryLink(a: Pick<FollowupAgreement, 'galleryLink' | 'galleryLinks'>): boolean {
  if (Array.isArray(a.galleryLinks) && a.galleryLinks.length > 0) {
    return a.galleryLinks.some(
      (g) => typeof g === 'object' && g !== null && typeof (g as { url?: unknown }).url === 'string' && (g as { url: string }).url.trim() !== '',
    );
  }
  return Boolean(a.galleryLink?.trim());
}

function eventDateKey(a: FollowupAgreement): string | null {
  const date = resolveAgreementEventDate(a);
  return date ? torontoDateKey(date) : null;
}

function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const next = addTorontoCalendarDays(y, m - 1, d, days);
  return `${next.year}-${String(next.month + 1).padStart(2, '0')}-${String(next.day).padStart(2, '0')}`;
}

/** On or after the launch cutoff. Agreements without an event date never qualify. */
export function isOnOrAfterLaunch(a: FollowupAgreement, launchKey: string): boolean {
  const key = eventDateKey(a);
  return key !== null && key >= launchKey;
}

/** The Toronto day the review request becomes due. */
export function reviewRequestDueDateKey(galleryEmailSentAt: Date): string {
  return addDaysToKey(torontoDateKey(galleryEmailSentAt), REVIEW_REQUEST_DELAY_DAYS);
}

/** Where the gallery email stands, for the agreement page and the daily run. */
export function galleryEmailStatus(a: FollowupAgreement, now: Date, launchKey: string): FollowupStatus {
  if (a.galleryEmailSentAt) return { kind: 'sent', at: a.galleryEmailSentAt };
  if (!isActiveForFollowups(a)) return { kind: 'skipped', reason: 'Agreement is cancelled or archived' };
  if (isDraft(a)) return { kind: 'skipped', reason: DRAFT_SKIP_REASON };
  const eventKey = eventDateKey(a);
  if (!eventKey) return { kind: 'waiting', reason: 'No event date' };
  if (eventKey < launchKey) return { kind: 'skipped', reason: 'Event is before automatic follow-ups started' };
  if (a.followUpsPaused) return { kind: 'paused' };
  if (!hasGalleryLink(a)) return { kind: 'waiting', reason: 'Waiting for a gallery link' };

  const todayKey = torontoDateKey(now);
  const firstSendKey = addDaysToKey(eventKey, 1);
  if (firstSendKey > todayKey) return { kind: 'scheduled', dateKey: firstSendKey };
  if (!hasNoBalanceOwing(a.paymentStatus)) return { kind: 'held' };
  return { kind: 'scheduled', dateKey: todayKey };
}

/** Where the review request stands. */
export function reviewRequestStatus(a: FollowupAgreement, now: Date, launchKey: string): FollowupStatus {
  if (a.reviewRequestSentAt) return { kind: 'sent', at: a.reviewRequestSentAt };
  if (!isActiveForFollowups(a)) return { kind: 'skipped', reason: 'Agreement is cancelled or archived' };
  if (isDraft(a)) return { kind: 'skipped', reason: DRAFT_SKIP_REASON };
  if (a.reviewReceived) return { kind: 'skipped', reason: 'Already reviewed' };
  if (!isOnOrAfterLaunch(a, launchKey)) {
    return eventDateKey(a)
      ? { kind: 'skipped', reason: 'Event is before automatic follow-ups started' }
      : { kind: 'waiting', reason: 'No event date' };
  }
  if (a.followUpsPaused) return { kind: 'paused' };
  if (!a.galleryEmailSentAt) return { kind: 'waiting', reason: 'Waiting for the gallery email' };

  const dueKey = reviewRequestDueDateKey(a.galleryEmailSentAt);
  const todayKey = torontoDateKey(now);
  return { kind: 'scheduled', dateKey: dueKey > todayKey ? dueKey : todayKey };
}

/** True when the gallery email should go out on today's run. */
export function isGalleryEmailDue(a: FollowupAgreement, now: Date, launchKey: string): boolean {
  const status = galleryEmailStatus(a, now, launchKey);
  return status.kind === 'scheduled' && status.dateKey === torontoDateKey(now);
}

/** True when everything but the balance says send: the gallery is held. */
export function isGalleryEmailHeld(a: FollowupAgreement, now: Date, launchKey: string): boolean {
  return galleryEmailStatus(a, now, launchKey).kind === 'held';
}

/** True when the review request should go out on today's run. */
export function isReviewRequestDue(a: FollowupAgreement, now: Date, launchKey: string): boolean {
  const status = reviewRequestStatus(a, now, launchKey);
  return status.kind === 'scheduled' && status.dateKey === torontoDateKey(now);
}

export type FollowupPlan = {
  galleryEmails: FollowupAgreement[];
  reviewRequests: FollowupAgreement[];
  /** Held galleries; `alert` is true when the one-time Telegram alert hasn't gone out yet. */
  held: { agreement: FollowupAgreement; alert: boolean }[];
};

/**
 * What today's run should do. A review request is never planned in the same run as its
 * gallery email: its 3-day clock starts when the gallery email is actually sent.
 */
export function planFollowups(agreements: FollowupAgreement[], now: Date, launchKey: string): FollowupPlan {
  const plan: FollowupPlan = { galleryEmails: [], reviewRequests: [], held: [] };
  for (const a of agreements) {
    if (isGalleryEmailDue(a, now, launchKey)) plan.galleryEmails.push(a);
    else if (isGalleryEmailHeld(a, now, launchKey)) plan.held.push({ agreement: a, alert: !a.galleryHeldAlertAt });
    if (isReviewRequestDue(a, now, launchKey)) plan.reviewRequests.push(a);
  }
  return plan;
}

/** Whether the manual review button may send: active, and no review request has gone out yet. */
export function manualReviewRefusal(
  a: Pick<FollowupAgreement, 'status' | 'archived' | 'cancelledAt' | 'reviewRequestSentAt'>,
): string | null {
  if (!isActiveForFollowups(a)) return 'This agreement is cancelled or archived.';
  if (a.reviewRequestSentAt) return 'A review request has already been sent for this agreement.';
  return null;
}

/** Plain-English status for the agreement page. */
export function describeFollowupStatus(status: FollowupStatus, formatDate: (d: Date | string) => string): string {
  switch (status.kind) {
    case 'sent':
      return `Sent ${formatDate(status.at)}`;
    case 'scheduled': {
      const day = parseTorontoCalendarDateKey(status.dateKey);
      return `Scheduled for ${day ? formatDate(day) : status.dateKey} at 10am`;
    }
    case 'held':
      return 'Held: balance owing';
    case 'paused':
      return 'Paused';
    case 'skipped':
      return `Skipped: ${status.reason}`;
    case 'waiting':
      return status.reason;
  }
}
