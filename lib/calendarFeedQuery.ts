import { Prisma } from '@prisma/client';
import {
  CALENDAR_FEED_STATUSES,
  calendarFeedWindow,
  type CalendarFeedSource,
} from '@/lib/calendarFeed';
import { addTorontoCalendarDaysFrom, parseTorontoCalendarDateKey } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { NO_CLIENT_EVENT_FIELDS } from '@/lib/events/booking';

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
 * Older agreements with no Event record (date on the client), active, near the feed window.
 * The range is padded by a day each side; callers apply the exact Toronto-day filter.
 */
export async function findCalendarFeedAgreements(now = new Date()): Promise<CalendarFeedSource[]> {
  const { fromKey, toKey } = calendarFeedWindow(now);
  const windowStart = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(fromKey) ?? now, -1);
  const windowEnd = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(toKey) ?? now, 2);

  // Agreements on an event reach the feed through their event (findCalendarFeedEvents).
  return prisma.agreement.findMany({
    where: {
      status: { in: [...CALENDAR_FEED_STATUSES] },
      archived: false,
      cancelledAt: null,
      eventId: null,
      client: { eventDate: { gte: windowStart, lt: windowEnd } },
    },
    select: calendarFeedSelect,
  });
}

const AGREEMENT_LABELS: Record<string, string> = {
  DRAFT: 'agreement draft',
  SENT: 'agreement sent, not signed',
  SIGNED: 'agreement signed',
  COMPLETED: 'agreement signed',
};

/** Every booked event in the feed window that isn't cancelled or archived. One entry each. */
export async function findCalendarFeedEvents(now = new Date()): Promise<CalendarFeedSource[]> {
  const { fromKey, toKey } = calendarFeedWindow(now);
  const windowStart = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(fromKey) ?? now, -1);
  const windowEnd = addTorontoCalendarDaysFrom(parseTorontoCalendarDateKey(toKey) ?? now, 2);

  const events = await prisma.event.findMany({
    where: {
      archived: false,
      status: { not: 'CANCELLED' },
      eventDate: { gte: windowStart, lt: windowEnd },
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      updatedAt: true,
      ...eventDetailSelect,
      client: { select: { firstName: true, lastName: true, phone: true, email: true } },
      backdropLink: { select: { name: true, attendant: { select: { name: true } } } },
      agreements: {
        where: { archived: false, status: { not: 'CANCELLED' } },
        select: { status: true },
      },
    },
  });

  return events.map((event) => {
    const statuses = event.agreements.map((a) => a.status);
    const best = ['COMPLETED', 'SIGNED', 'SENT', 'DRAFT'].find((s) => (statuses as string[]).includes(s));
    return {
      kind: 'event' as const,
      id: event.id,
      status: event.status,
      agreementLabel: best ? AGREEMENT_LABELS[best] : null,
      archived: false,
      cancelledAt: null,
      paymentStatus: event.paymentStatus,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      eventId: event.id,
      client: { ...event.client, ...NO_CLIENT_EVENT_FIELDS },
      event: {
        eventDate: event.eventDate,
        eventLocation: event.eventLocation,
        eventStartTime: event.eventStartTime,
        eventDuration: event.eventDuration,
        eventPackage: event.eventPackage,
      },
      backdropLink: event.backdropLink,
    };
  });
}
