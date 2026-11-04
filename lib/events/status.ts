import { queueCalendarSync } from '@/lib/googleCalendar/sync';
import { logAgreementActivity } from '@/lib/activityLog';
import { logEventActivity, type EventStatusValue } from '@/lib/events/booking';
import { prisma } from '@/lib/prisma';

export const EVENT_STATUSES: readonly EventStatusValue[] = ['UPCOMING', 'COMPLETED', 'CANCELLED'];

export type EventStatusChange = {
  eventId: string;
  from: EventStatusValue;
  to: EventStatusValue;
  /** Agreements whose status followed the event. */
  agreements: { id: string; from: string; to: string }[];
};

/**
 * Change an event's status, and carry it to its agreements:
 * - Completed: signed agreements become Completed (unsigned ones are left alone; Completed means signed).
 * - Cancelled: every agreement that isn't already cancelled is cancelled.
 * - Back to Upcoming: agreements are not changed.
 * Sends nothing. Archiving stays a separate step, as before.
 */
export async function setEventStatus(
  eventId: string,
  to: EventStatusValue,
  options: { now?: Date; reason?: string | null; by?: string; activityType?: 'EVENT_STATUS_CHANGED' | 'AUTO_COMPLETED' } = {},
): Promise<EventStatusChange | null> {
  const now = options.now ?? new Date();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, agreements: { select: { id: true, status: true } } },
  });
  if (!event) return null;
  const from = event.status as EventStatusValue;

  if (from === to) return { eventId, from, to, agreements: [] };

  const agreementChanges: EventStatusChange['agreements'] = [];
  let changed = false;
  await prisma.$transaction(async (tx) => {
    // Conditional on the status we read, so a change made in between is never overwritten.
    const { count } = await tx.event.updateMany({
      where: { id: eventId, status: from },
      data: {
        status: to,
        completedAt: to === 'COMPLETED' ? now : null,
        cancelledAt: to === 'CANCELLED' ? now : null,
        cancellationReason: to === 'CANCELLED' ? options.reason?.trim() || null : null,
      },
    });
    if (count === 0) return;
    changed = true;

    for (const agreement of event.agreements) {
      if (to === 'COMPLETED' && agreement.status === 'SIGNED') {
        await tx.agreement.update({ where: { id: agreement.id }, data: { status: 'COMPLETED' } });
        agreementChanges.push({ id: agreement.id, from: agreement.status, to: 'COMPLETED' });
      }
      if (to === 'CANCELLED' && agreement.status !== 'CANCELLED') {
        await tx.agreement.update({
          where: { id: agreement.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: now,
            cancelledBy: options.by ?? 'admin',
            cancellationReason: options.reason?.trim() || 'Event cancelled',
          },
        });
        agreementChanges.push({ id: agreement.id, from: agreement.status, to: 'CANCELLED' });
      }
    }
  });

  if (!changed) return null;
  queueCalendarSync(eventId);

  await logEventActivity(eventId, options.activityType ?? 'EVENT_STATUS_CHANGED', { from, to });
  for (const change of agreementChanges) {
    await logAgreementActivity(change.id, to === 'CANCELLED' ? 'CANCELLED' : 'AUTO_COMPLETED', {
      reason: `Event marked ${to.toLowerCase()}`,
    });
  }
  return { eventId, from, to, agreements: agreementChanges };
}
