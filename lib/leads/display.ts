import {
  formatDateToronto,
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
      formatDateToronto(lead.eventDate),
    );
  }
  return `/admin/quotes?${params.toString()}`;
}

export function getAgreementViewUrl(agreementId: string): string {
  return `/admin/agreements?highlight=${agreementId}`;
}

/** Admin page for one event (the Events page with its drawer open). Same path as lib/events/booking. */
export function adminEventHref(eventId: string): string {
  return `/admin/events?event=${encodeURIComponent(eventId)}`;
}

const OPEN_STATUSES = new Set(['NEW', 'FOLLOWING_UP', 'PAUSED']);

export function isOpenLeadStatus(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

/** The lead replied after our last touch and is still open: answer them first. */
export function needsReply(lead: {
  status: string;
  lastReplyAt?: Date | string | null;
  lastContactedAt?: Date | string | null;
  archivedAt?: Date | string | null;
}): boolean {
  if (!lead.lastReplyAt || lead.archivedAt || !isOpenLeadStatus(lead.status)) return false;
  if (!lead.lastContactedAt) return true;
  return new Date(lead.lastReplyAt).getTime() > new Date(lead.lastContactedAt).getTime();
}

/** "3 touches · next Nov 6" for the row, or null when there's nothing to say. */
export function formatFollowUpLine(lead: {
  status: string;
  contactCount: number;
  nextFollowUpAt?: Date | string | null;
}): string | null {
  const parts: string[] = [];
  if (lead.contactCount > 0) parts.push(lead.contactCount === 1 ? '1 touch' : `${lead.contactCount} touches`);
  if (lead.nextFollowUpAt && lead.status === 'FOLLOWING_UP') {
    parts.push(`next ${formatEventDateTorontoShort(lead.nextFollowUpAt)}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export type PrimaryLeadAction =
  | { kind: 'mark_booked'; label: 'Mark booked' }
  | { kind: 'view_event'; href: string; label: 'View event' };

export function getPrimaryLeadAction(lead: {
  status: string;
  archivedAt?: Date | string | null;
  eventId?: string | null;
}): PrimaryLeadAction | null {
  if (lead.status === 'BOOKED') {
    return lead.eventId ? { kind: 'view_event', href: adminEventHref(lead.eventId), label: 'View event' } : null;
  }
  if (lead.archivedAt || !isOpenLeadStatus(lead.status)) return null;
  return { kind: 'mark_booked', label: 'Mark booked' };
}
