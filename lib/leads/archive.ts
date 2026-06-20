import type { Lead } from '@prisma/client';
import { isTorontoDateAfter, torontoCalendarDaysBetween } from '@/lib/dates';

export const STALE_DAYS = 90;
export const EVENT_PASSED_BUFFER_DAYS = 2;

export type ArchiveReason = 'booked' | 'lost' | 'event_passed' | 'stale' | 'manual';

export type LeadForAutoArchive = Pick<
  Lead,
  'archivedAt' | 'eventId' | 'eventDate' | 'lastContactedAt' | 'createdAt'
> & {
  agreement?: { id: string } | null;
};

export function getAutoArchiveReason(
  lead: LeadForAutoArchive,
  now: Date = new Date(),
): 'event_passed' | 'stale' | null {
  if (lead.archivedAt) {
    return null;
  }

  if (lead.eventId || lead.agreement) {
    return null;
  }

  if (lead.eventDate) {
    const daysSinceEvent = torontoCalendarDaysBetween(lead.eventDate, now);
    if (daysSinceEvent > EVENT_PASSED_BUFFER_DAYS) {
      return 'event_passed';
    }
  }

  const lastContact = lead.lastContactedAt ?? lead.createdAt;
  const daysSinceContact = torontoCalendarDaysBetween(lastContact, now);
  const eventStillUpcoming = !lead.eventDate || isTorontoDateAfter(lead.eventDate, now);

  if (daysSinceContact >= STALE_DAYS && eventStillUpcoming) {
    return 'stale';
  }

  return null;
}
