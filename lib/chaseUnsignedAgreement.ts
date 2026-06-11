import type { Agreement, Client, Event, Signature } from '@prisma/client';
import {
  formatEventDateToronto,
  formatEventDateTorontoShort,
  isTorontoDateAfter,
  torontoCalendarDaysBetween,
  torontoDaysUntil,
} from '@/lib/dates';

export const NEXT_ACTION_REMINDERS_EXHAUSTED =
  'Automated reminders exhausted — manual follow-up needed';

export type ChaseAgreement = Agreement & {
  client: Pick<Client, 'firstName' | 'lastName' | 'email' | 'eventDate'>;
  event: Pick<Event, 'eventDate'> | null;
  signatures: Pick<Signature, 'signerEmail'>[];
};

export type ReminderRecipient = 'client' | 'secondSigner';

export type ResolvedReminderRecipient = {
  to: string;
  cc?: string[];
  recipient: ReminderRecipient;
  greetingFirstName: string;
};

export function getEventDate(agreement: ChaseAgreement): Date | null {
  const raw = agreement.event?.eventDate ?? agreement.client.eventDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isEventStrictlyAfterToday(eventDate: Date, now = new Date()): boolean {
  return isTorontoDateAfter(eventDate, now);
}

export function daysUntilEvent(eventDate: Date, now = new Date()): number {
  return torontoDaysUntil(eventDate, now);
}

export function isAcceleratedCadence(eventDate: Date | null, now = new Date()): boolean {
  if (!eventDate) return false;
  const days = daysUntilEvent(eventDate, now);
  return days > 0 && days <= 10;
}

function getReminder2Anchor(agreement: ChaseAgreement): Date | null {
  const timestamps = [agreement.lastReminderAt, agreement.lastEmailedAt].filter(
    (value): value is Date => value instanceof Date,
  );
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps.map((value) => value.getTime())));
}

export function isDueForReminder(agreement: ChaseAgreement, now = new Date()): boolean {
  if (!agreement.lastEmailedAt) return false;

  const eventDate = getEventDate(agreement);
  const accelerated = isAcceleratedCadence(eventDate, now);
  const reminder1Threshold = accelerated ? 1 : 3;
  const reminder2Threshold = accelerated ? 2 : 4;

  if (agreement.reminderCount === 0) {
    return torontoCalendarDaysBetween(agreement.lastEmailedAt, now) >= reminder1Threshold;
  }

  if (agreement.reminderCount === 1) {
    const anchor = getReminder2Anchor(agreement);
    if (!anchor) return false;
    return torontoCalendarDaysBetween(anchor, now) >= reminder2Threshold;
  }

  return false;
}

function buildSecondSignerCc(agreement: ChaseAgreement): string[] {
  const secondSignerEnabled = Boolean(agreement.secondSignerEnabled);
  const secondSignerEmail = agreement.secondSignerEmail;
  if (
    !secondSignerEnabled ||
    !secondSignerEmail ||
    secondSignerEmail.toLowerCase() === agreement.client.email.toLowerCase()
  ) {
    return [];
  }
  return [secondSignerEmail];
}

export function resolveReminderRecipient(
  agreement: ChaseAgreement,
): ResolvedReminderRecipient | null {
  const primaryEmail = agreement.client.email.toLowerCase();
  const secondSignerEnabled = Boolean(agreement.secondSignerEnabled);
  const secondaryEmail = secondSignerEnabled
    ? (agreement.secondSignerEmail || '').toLowerCase()
    : '';
  const requireBoth = secondSignerEnabled && Boolean(agreement.requireBothSignatures);

  const primarySigned = agreement.signatures.some(
    (signature) => signature.signerEmail.toLowerCase() === primaryEmail,
  );
  const secondarySigned = secondaryEmail
    ? agreement.signatures.some(
        (signature) => signature.signerEmail.toLowerCase() === secondaryEmail,
      )
    : false;

  if (requireBoth) {
    if (primarySigned && secondarySigned) return null;

    if (!primarySigned && !secondarySigned) {
      return {
        to: agreement.client.email,
        cc: buildSecondSignerCc(agreement),
        recipient: 'client',
        greetingFirstName: agreement.client.firstName || 'there',
      };
    }

    if (primarySigned && !secondarySigned && agreement.secondSignerEmail) {
      return {
        to: agreement.secondSignerEmail,
        recipient: 'secondSigner',
        greetingFirstName: agreement.secondSignerFirstName || 'there',
      };
    }

    if (!primarySigned && secondarySigned) {
      return {
        to: agreement.client.email,
        recipient: 'client',
        greetingFirstName: agreement.client.firstName || 'there',
      };
    }

    return null;
  }

  if (primarySigned) return null;

  return {
    to: agreement.client.email,
    cc: buildSecondSignerCc(agreement),
    recipient: 'client',
    greetingFirstName: agreement.client.firstName || 'there',
  };
}

export function filterDueChaseAgreements(
  candidates: ChaseAgreement[],
  now = new Date(),
): ChaseAgreement[] {
  return candidates.filter((agreement) => {
    const eventDate = getEventDate(agreement);
    if (!eventDate || !isEventStrictlyAfterToday(eventDate, now)) return false;
    if (!isDueForReminder(agreement, now)) return false;
    return resolveReminderRecipient(agreement) !== null;
  });
}

export function formatEventDateForEmail(eventDate: Date): string {
  return formatEventDateToronto(eventDate);
}

export function formatEventDateForTelegram(eventDate: Date): string {
  return formatEventDateTorontoShort(eventDate);
}
