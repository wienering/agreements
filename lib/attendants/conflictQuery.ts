import { Prisma } from '@prisma/client';
import {
  CONFLICT_BUFFERS_SETTINGS_KEY,
  parseConflictBuffers,
  type ConflictBuffers,
} from '@/lib/attendants/conflictSettings';
import { CONFLICT_STATUSES, type ConflictAgreement } from '@/lib/attendants/conflicts';
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
  eventId: true,
  client: { select: { firstName: true, lastName: true, ...eventDetailSelect } },
  event: { select: eventDetailSelect },
  backdropLink: { select: { attendantId: true } },
} satisfies Prisma.AgreementSelect;

type ConflictRecord = Prisma.AgreementGetPayload<{ select: typeof conflictSelect }>;

function toConflictAgreement(record: ConflictRecord): ConflictAgreement {
  return {
    id: record.id,
    status: record.status,
    archived: record.archived,
    cancelledAt: record.cancelledAt,
    createdAt: record.createdAt,
    eventId: record.eventId,
    attendantId: record.backdropLink?.attendantId ?? null,
    clientName: `${record.client.firstName} ${record.client.lastName}`.trim(),
    client: record.client,
    event: record.event,
  };
}

export async function loadConflictBuffers(): Promise<ConflictBuffers> {
  const setting = await prisma.settings.findUnique({ where: { key: CONFLICT_BUFFERS_SETTINGS_KEY } });
  return parseConflictBuffers(setting?.value);
}

/**
 * Agreements that hold an attendant's time from yesterday onward (Toronto).
 * Past double-bookings aren't worth warning about.
 */
export async function loadUpcomingAssignedAgreements(now = new Date()): Promise<ConflictAgreement[]> {
  const from = addTorontoCalendarDaysFrom(now, -1);
  const records = await prisma.agreement.findMany({
    where: {
      status: { in: [...CONFLICT_STATUSES] },
      archived: false,
      cancelledAt: null,
      backdropLink: { is: { attendantId: { not: null } } },
      OR: [
        { event: { is: { eventDate: { gte: from } } } },
        {
          AND: [
            { OR: [{ eventId: null }, { event: { is: { eventDate: null } } }] },
            { client: { eventDate: { gte: from } } },
          ],
        },
      ],
    },
    select: conflictSelect,
  });
  return records.map(toConflictAgreement);
}

export async function loadConflictAgreement(id: string): Promise<ConflictAgreement | null> {
  const record = await prisma.agreement.findUnique({ where: { id }, select: conflictSelect });
  return record ? toConflictAgreement(record) : null;
}
