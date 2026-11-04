import { Prisma } from '@prisma/client';
import {
  CONFLICT_BUFFERS_SETTINGS_KEY,
  parseConflictBuffers,
  type ConflictBuffers,
} from '@/lib/attendants/conflictSettings';
import { type ConflictAgreement } from '@/lib/attendants/conflicts';
import { bookingStatusOf, NO_CLIENT_EVENT_FIELDS, resolveEventId } from '@/lib/events/booking';
import { addTorontoCalendarDaysFrom } from '@/lib/dates';
import { prisma } from '@/lib/prisma';

const eventDetailSelect = {
  eventDate: true,
  eventLocation: true,
  eventStartTime: true,
  eventDuration: true,
  eventPackage: true,
} as const;

const conflictSelect = {
  id: true,
  status: true,
  archived: true,
  cancelledAt: true,
  createdAt: true,
  ...eventDetailSelect,
  client: { select: { firstName: true, lastName: true } },
  backdropLink: { select: { attendantId: true } },
} satisfies Prisma.EventSelect;

type ConflictRecord = Prisma.EventGetPayload<{ select: typeof conflictSelect }>;

/** An event as a conflict job. `id` and `eventId` are both the event id. */
function toConflictAgreement(record: ConflictRecord): ConflictAgreement {
  return {
    id: record.id,
    status: bookingStatusOf(record.status),
    archived: record.archived,
    cancelledAt: record.cancelledAt,
    createdAt: record.createdAt,
    eventId: record.id,
    attendantId: record.backdropLink?.attendantId ?? null,
    clientName: `${record.client.firstName} ${record.client.lastName}`.trim(),
    client: { ...NO_CLIENT_EVENT_FIELDS },
    event: {
      eventDate: record.eventDate,
      eventLocation: record.eventLocation,
      eventStartTime: record.eventStartTime,
      eventDuration: record.eventDuration,
      eventPackage: record.eventPackage,
    },
  };
}

export async function loadConflictBuffers(): Promise<ConflictBuffers> {
  const setting = await prisma.settings.findUnique({ where: { key: CONFLICT_BUFFERS_SETTINGS_KEY } });
  return parseConflictBuffers(setting?.value);
}

/**
 * Events that hold an attendant's time from yesterday onward (Toronto).
 * Past double-bookings aren't worth warning about.
 */
export async function loadUpcomingAssignedAgreements(now = new Date()): Promise<ConflictAgreement[]> {
  const from = addTorontoCalendarDaysFrom(now, -1);
  const records = await prisma.event.findMany({
    where: {
      status: { not: 'CANCELLED' },
      archived: false,
      cancelledAt: null,
      backdropLink: { is: { attendantId: { not: null } } },
      eventDate: { gte: from },
    },
    select: conflictSelect,
  });
  return records.map(toConflictAgreement);
}

/** By event id, or an agreement id on the event (older callers). */
export async function loadConflictAgreement(id: string): Promise<ConflictAgreement | null> {
  const eventId = await resolveEventId(id);
  if (!eventId) return null;
  const record = await prisma.event.findUnique({ where: { id: eventId }, select: conflictSelect });
  return record ? toConflictAgreement(record) : null;
}
