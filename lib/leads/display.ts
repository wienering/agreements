import {
  formatEventDateTorontoShort,
  torontoCalendarDaysBetween,
  torontoDateKey,
  torontoDaysUntil,
} from '@/lib/dates';
import type { LeadGroup } from '@/lib/leads/grouping';

export const STAGE_LABELS: Record<string, string> = {
  QUOTE_REQUESTED: 'Quote Requested',
  QUOTE_SENT: 'Quote Sent',
  AGREEMENT_SENT: 'Agreement Sent',
  SIGNED: 'Signed',
  COMPLETED: 'Completed',
  LOST: 'Lost',
};

export const ARCHIVE_REASON_LABELS: Record<string, string> = {
  booked: 'Booked',
  lost: 'Lost',
  event_passed: 'Event passed',
  stale: 'Stale',
  manual: 'Manual',
};

export type LeadDateBadge = {
  primary: string;
  secondary: string;
  group: LeadGroup | 'archived';
};

export function formatLeadDateBadge(
  eventDate: Date | string | null | undefined,
  now: Date = new Date(),
): LeadDateBadge {
  if (!eventDate) {
    return { primary: 'No date', secondary: 'no date', group: 'no_date' };
  }

  const eventKey = torontoDateKey(eventDate);
  const todayKey = torontoDateKey(now);

  if (eventKey < todayKey) {
    const daysAgo = torontoCalendarDaysBetween(eventDate, now);
    return {
      primary: formatEventDateTorontoShort(eventDate),
      secondary: daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`,
      group: 'urgent',
    };
  }

  if (eventKey === todayKey) {
    return {
      primary: formatEventDateTorontoShort(eventDate),
      secondary: 'Today',
      group: 'urgent',
    };
  }

  const daysUntil = torontoDaysUntil(eventDate, now);
  if (daysUntil <= 14) {
    return {
      primary: formatEventDateTorontoShort(eventDate),
      secondary: daysUntil === 1 ? 'in 1 day' : `in ${daysUntil} days`,
      group: 'urgent',
    };
  }

  if (daysUntil <= 90) {
    return {
      primary: formatEventDateTorontoShort(eventDate),
      secondary: `in ${daysUntil} days`,
      group: 'coming_up',
    };
  }

  return {
    primary: formatEventDateTorontoShort(eventDate),
    secondary: formatEventDateTorontoShort(eventDate),
    group: 'later',
  };
}

export function getQuoteUrl(lead: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  eventDate?: Date | string | null;
}): string {
  const params = new URLSearchParams();
  params.set('name', `${lead.firstName} ${lead.lastName}`.trim());
  params.set('email', lead.email);
  if (lead.phone) params.set('phone', lead.phone);
  if (lead.eventDate) {
    params.set(
      'eventDate',
      new Date(lead.eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }),
    );
  }
  return `/admin/quotes?${params.toString()}`;
}

export function getAgreementViewUrl(agreementId: string): string {
  return `/admin/agreements?highlight=${agreementId}`;
}

export type PrimaryLeadAction =
  | { kind: 'create_quote'; href: string; label: 'Create quote' }
  | { kind: 'create_agreement'; label: 'Create agreement' }
  | { kind: 'view_agreement'; href: string; label: 'View agreement' }
  | { kind: 'view'; href: string; label: 'View' };

export function getPrimaryLeadAction(lead: {
  stage: string;
  archivedAt?: Date | string | null;
  agreement?: { id: string } | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  eventDate?: Date | string | null;
}): PrimaryLeadAction | null {
  const isArchived = Boolean(lead.archivedAt);
  const closedStage = ['SIGNED', 'COMPLETED', 'LOST'].includes(lead.stage);

  if (isArchived || closedStage) {
    if (lead.agreement) {
      return {
        kind: 'view',
        href: getAgreementViewUrl(lead.agreement.id),
        label: 'View',
      };
    }
    return null;
  }

  switch (lead.stage) {
    case 'QUOTE_REQUESTED':
      return { kind: 'create_quote', href: getQuoteUrl(lead), label: 'Create quote' };
    case 'QUOTE_SENT':
      return { kind: 'create_agreement', label: 'Create agreement' };
    case 'AGREEMENT_SENT':
      if (lead.agreement) {
        return {
          kind: 'view_agreement',
          href: getAgreementViewUrl(lead.agreement.id),
          label: 'View agreement',
        };
      }
      return null;
    default:
      return null;
  }
}
