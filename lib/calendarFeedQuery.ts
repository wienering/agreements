import { Prisma } from '@prisma/client';
import {
  CALENDAR_FEED_STATUSES,
  calendarFeedWindow,
  type CalendarFeedSource,
} from '@/lib/calendarFeed';
import { addTorontoCalendarDaysFrom, parseTorontoCalendarDateKey } from '@/lib/dates';
import { prisma } from '@/lib/prisma';

const eventDetailSelect = {
  eventDate: true,
  eventLocation: true,
  eventStartTime: true,
  eventDuration: true,
  eventPackage: true,
} as const;

const calendarFeedSelect = {
  id: true,
  status: true,
  archived: true,
  cancelledAt: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
  eventId: true,
  secondSignerEnabled: true,
  secondSignerEmail: true,
  requireBothSignatures: true,
  signatures: { select: { signerEmail: true } },
  client: {
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      ...eventDetailSelect,
    },
  },
  event: { select: eventDetailSelect },
  backdropLink: { select: { name: true, attendant: { select: { name: true } } } },
} satisfies Prisma.AgreementSelect;

/**
 * Active (not cancelled or archived) agreements with an event date near the feed window.
 * The range is padded by a day each side; callers apply the exact Toronto-day filter.
 */
export async function findCalendarFeedAgreements(now = new Date()): Promise<CalendarFeedSource[]> {
  const { fromKey, toKey } = calendarFeedWindow(now);
  const windowStart = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(fromKey) ?? now, -1);
  const windowEnd = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(toKey) ?? now, 2);

  return prisma.agreement.findMany({
    where: {
      status: { in: [...CALENDAR_FEED_STATUSES] },
      archived: false,
      cancelledAt: null,
      OR: [
        { event: { eventDate: { gte: windowStart, lt: windowEnd } } },
        {
          AND: [
            { OR: [{ eventId: null }, { event: { is: { eventDate: null } } }] },
            { client: { eventDate: { gte: windowStart, lt: windowEnd } } },
          ],
        },
      ],
    },
    select: calendarFeedSelect,
  });
}
