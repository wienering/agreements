import {
  addTorontoCalendarDaysFrom,
  resolveAgreementEventDate,
  torontoCalendarDaysBetween,
  torontoDateKey,
} from '@/lib/dates';
import { isSigned } from '@/lib/agreementStatus';
import { isFullyPaid, PAYMENT_STATUS_FULLY_PAID } from '@/lib/paymentStatus';

/** The value written when marking paid. Use isFullyPaid() to check, not an exact match. */
export const FULLY_PAID_STATUS = PAYMENT_STATUS_FULLY_PAID;

/** Inclusive window: today through this many Toronto calendar days ahead. */
export const BALANCE_DIGEST_LOOKAHEAD_DAYS = 10;

/**
 * Events model go-live (Toronto date). Earlier events never had their payment status carried over
 * in the events migration, so the digest ignores them. They are left exactly as they are.
 */
export const BALANCE_DIGEST_START_DATE_KEY = '2026-11-04';

/** Confirmed snooze hides the agreement until this many Toronto days from now. */
export const BALANCE_DIGEST_SNOOZE_DAYS = 3;

export type BalanceDigestCandidate = {
  status: string;
  archived: boolean;
  cancelledAt: Date | string | null;
  paymentStatus: string | null;
  balanceDigestSnoozedUntil: Date | string | null;
  event?: { eventDate: Date | null } | null;
  client?: { eventDate: Date | null } | null;
};

/**
 * Snoozed past today means the snooze date is still a later Toronto calendar day.
 * A snooze dated today is over, so the agreement is included again.
 */
export function isSnoozedPastToday(
  snoozedUntil: Date | string | null | undefined,
  now = new Date(),
): boolean {
  if (!snoozedUntil) return false;
  const snoozeKey = torontoDateKey(snoozedUntil);
  const todayKey = torontoDateKey(now);
  return snoozeKey !== '' && snoozeKey > todayKey;
}

export function isEventWithinBalanceWindow(eventDate: Date, now = new Date()): boolean {
  const eventKey = torontoDateKey(eventDate);
  if (!eventKey) return false;
  const todayKey = torontoDateKey(now);
  const lastKey = torontoDateKey(
    addTorontoCalendarDaysFrom(now, BALANCE_DIGEST_LOOKAHEAD_DAYS),
  );
  return eventKey >= todayKey && eventKey <= lastKey;
}

/** A completed event can be in the past: any event up to the end of the window counts. */
export function isEventOnOrBeforeBalanceWindowEnd(eventDate: Date, now = new Date()): boolean {
  const eventKey = torontoDateKey(eventDate);
  if (!eventKey) return false;
  const lastKey = torontoDateKey(addTorontoCalendarDaysFrom(now, BALANCE_DIGEST_LOOKAHEAD_DAYS));
  return eventKey <= lastKey;
}

/**
 * Signed agreements with an event in the next 10 days, and completed agreements (whose event has
 * usually passed), that are not fully paid, archived, cancelled or snoozed.
 */
export function isIncludedInBalanceDigest(
  agreement: BalanceDigestCandidate,
  now = new Date(),
): boolean {
  if (!isSigned(agreement.status)) return false;
  if (agreement.archived) return false;
  if (agreement.cancelledAt) return false;
  if (isFullyPaid(agreement.paymentStatus)) return false;
  if (isSnoozedPastToday(agreement.balanceDigestSnoozedUntil, now)) return false;

  const eventDate = resolveAgreementEventDate(agreement);
  if (!eventDate) return false;
  return agreement.status === 'COMPLETED'
    ? isEventOnOrBeforeBalanceWindowEnd(eventDate, now)
    : isEventWithinBalanceWindow(eventDate, now);
}

/** A balance is owing only when the event has a price above $0. Missing or $0 is nothing owing. */
export function hasBalanceOwing(packagePrice: number | string | { toString(): string } | null | undefined): boolean {
  if (packagePrice == null) return false;
  const amount = Number(typeof packagePrice === 'number' ? packagePrice : packagePrice.toString());
  return Number.isFinite(amount) && amount > 0;
}

/** On or after the events go-live, by Toronto calendar day. */
export function isOnOrAfterBalanceDigestStart(
  eventDate: Date,
  startKey: string = BALANCE_DIGEST_START_DATE_KEY,
): boolean {
  const eventKey = torontoDateKey(eventDate);
  return eventKey !== '' && eventKey >= startKey;
}

/**
 * What the daily digest lists: isIncludedInBalanceDigest, limited to events on or after the
 * events go-live that have a balance above $0.
 */
export function isListedInBalanceDigest(
  event: BalanceDigestCandidate & { packagePrice: number | string | { toString(): string } | null | undefined },
  now = new Date(),
  startKey: string = BALANCE_DIGEST_START_DATE_KEY,
): boolean {
  const eventDate = resolveAgreementEventDate(event);
  if (!eventDate || !isOnOrAfterBalanceDigestStart(eventDate, startKey)) return false;
  if (!hasBalanceOwing(event.packagePrice)) return false;
  return isIncludedInBalanceDigest(event, now);
}

export function balanceDigestSnoozeUntil(now = new Date()): Date {
  return addTorontoCalendarDaysFrom(now, BALANCE_DIGEST_SNOOZE_DAYS);
}

export function daysUntilEvent(eventDate: Date, now = new Date()): number {
  return torontoCalendarDaysBetween(now, eventDate);
}

export function formatDaysUntilEvent(eventDate: Date, now = new Date()): string {
  const days = daysUntilEvent(eventDate, now);
  if (days === -1) return '1 day ago';
  if (days < 0) return `${-days} days ago`;
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}
