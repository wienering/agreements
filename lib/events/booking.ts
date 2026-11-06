import { AgreementActivityType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/appUrl';

/**
 * Events are the booking. These helpers let the existing booking rules (follow-ups, balance
 * digest, double-booking) run on events: an event is presented in the shape those rules expect,
 * with UPCOMING read as an active, confirmed booking.
 */

export type EventStatusValue = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

/**
 * The status the agreement-era rules understand. An upcoming event is a confirmed booking, so it
 * reads as SIGNED (never DRAFT: drafts were skipped because the client hadn't seen an agreement).
 */
export function bookingStatusOf(status: string): 'SIGNED' | 'COMPLETED' | 'CANCELLED' {
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'SIGNED';
}

/** Admin page for one event: the Events page with its drawer open. */
export function adminEventPath(eventId: string): string {
  return `/admin/events?event=${encodeURIComponent(eventId)}`;
}

export function adminEventUrl(eventId: string): string {
  return `${appUrl()}${adminEventPath(eventId)}`;
}

export async function logEventActivity(
  eventId: string,
  type: AgreementActivityType,
  meta?: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await prisma.eventActivity.create({
      data: { eventId, type, ...(meta !== undefined ? { meta } : {}) },
    });
  } catch (error) {
    console.error('[eventActivity] Failed to log event activity:', { eventId, type, error });
  }
}

/** Legacy client event fields, blank: events carry their own date and details. */
export const NO_CLIENT_EVENT_FIELDS = {
  eventDate: null,
  eventLocation: null,
  eventStartTime: null,
  eventDuration: null,
  eventPackage: null,
} as const;

/**
 * The event for an id that may be an event id or (from older links, emails and callers) an
 * agreement id. Null when neither exists or the agreement has no event.
 */
export async function resolveEventId(id: string): Promise<string | null> {
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (event) return event.id;
  const agreement = await prisma.agreement.findUnique({ where: { id }, select: { eventId: true } });
  return agreement?.eventId ?? null;
}
