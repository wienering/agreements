import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatEventDateTorontoShort } from '@/lib/dates';
import { setLeadStatus } from '@/lib/leads/setStatus';

/**
 * When a booking (event) is created, find the client's open leads and mark them booked, so the
 * follow-up sequence stops however the client booked (Bookly, Mark booked, the Claude connector, by hand).
 *
 * Only leads that came in before the event was created are linked: a lead that arrives after an existing
 * booking is a new enquiry (a repeat client), not this booking.
 */

const OPEN_STATUSES = ['NEW', 'FOLLOWING_UP', 'PAUSED'] as const;

export type BookingLinkResult = { linked: string[] };

export async function linkOpenLeadsToEvent(eventId: string): Promise<BookingLinkResult> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, createdAt: true, eventDate: true, status: true, archived: true, client: { select: { id: true, email: true } } },
  });
  if (!event?.client?.email || event.archived || event.status === 'CANCELLED') return { linked: [] };

  const leads = await prisma.lead.findMany({
    where: {
      email: { equals: event.client.email.trim(), mode: 'insensitive' },
      status: { in: [...OPEN_STATUSES] },
      createdAt: { lte: event.createdAt },
    },
    select: { id: true },
  });

  const when = event.eventDate ? ` for ${formatEventDateTorontoShort(event.eventDate)}` : '';
  const linked: string[] = [];
  for (const lead of leads) {
    await prisma.lead.update({ where: { id: lead.id }, data: { clientId: event.client.id, eventId: event.id } });
    await setLeadStatus({
      leadId: lead.id,
      status: 'BOOKED',
      source: 'admin',
      note: `Booking added${when}; linked automatically`,
      syncSheet: true,
    });
    linked.push(lead.id);
  }
  return { linked };
}

/** Run after the response is sent (never slows or breaks the booking itself). */
export function queueLeadBookingLink(eventId: string | null | undefined): void {
  if (!eventId) return;
  const task = () =>
    linkOpenLeadsToEvent(eventId).catch((error) => console.error('[lead-booking-link] failed', eventId, error));
  try {
    after(task);
  } catch {
    void task();
  }
}
