import type { Lead } from '@prisma/client';
import { torontoCalendarDaysBetween, torontoDateKey } from '@/lib/dates';

export const URGENT_DAYS = 14;
export const COMING_UP_DAYS = 90;

export type LeadGroup = 'urgent' | 'coming_up' | 'later' | 'no_date';

export type LeadForGrouping = Pick<Lead, 'eventDate'>;

export function getLeadGroup(lead: LeadForGrouping, now: Date = new Date()): LeadGroup {
  if (!lead.eventDate) {
    return 'no_date';
  }

  const eventKey = torontoDateKey(lead.eventDate);
  const todayKey = torontoDateKey(now);

  if (eventKey <= todayKey) {
    return 'urgent';
  }

  const daysUntil = torontoCalendarDaysBetween(now, lead.eventDate);
  if (daysUntil <= URGENT_DAYS) {
    return 'urgent';
  }

  if (daysUntil <= COMING_UP_DAYS) {
    return 'coming_up';
  }

  return 'later';
}

export const LEAD_GROUP_ORDER: LeadGroup[] = ['urgent', 'coming_up', 'later', 'no_date'];

export const LEAD_GROUP_LABELS: Record<LeadGroup, string> = {
  urgent: 'Needs action now',
  coming_up: 'Coming up',
  later: 'Later',
  no_date: 'No event date',
};
