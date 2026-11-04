import { Prisma } from '@prisma/client';
import {
  CALENDAR_FEED_STATUSES,
  EVENT_ONLY_STATUS,
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

/**
 * Booked events (not archived) in the feed window with no active agreement.
 * Events that do have one reach the feed through findCalendarFeedAgreements.
 */
export async function findCalendarFeedEventsWithoutAgreement(now = new Date()): Promise<CalendarFeedSource[]> {
  const { fromKey, toKey } = calendarFeedWindow(now);
  const windowStart = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(fromKey) ?? now, -1);
  const windowEnd = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(toKey) ?? now, 2);

  const events = await prisma.event.findMany({
    where: {
      archived: false,
      eventDate: { gte: windowStart, lt: windowEnd },
      agreements: {
        none: { status: { in: [...CALENDAR_FEED_STATUSES] }, archived: false, cancelledAt: null },
      },
    },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      ...eventDetailSelect,
      client: { select: { firstName: true, lastName: true, phone: true, email: true } },
    },
  });

  return events.map((event) => {
    const details = {
      eventDate: event.eventDate,
      eventLocation: event.eventLocation,
      eventStartTime: event.eventStartTime,
      eventDuration: event.eventDuration,
      eventPackage: event.eventPackage,
    };
    return {
      kind: 'event' as const,
      id: event.id,
      status: EVENT_ONLY_STATUS,
      archived: false,
      cancelledAt: null,
      paymentStatus: null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      eventId: event.id,
      client: {
        ...event.client,
        eventDate: null,
        eventLocation: null,
        eventStartTime: null,
        eventDuration: null,
        eventPackage: null,
      },
      event: details,
      backdropLink: null,
    };
  });
}
