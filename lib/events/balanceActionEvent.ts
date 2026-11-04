import { prisma } from '@/lib/prisma';
import { bookingStatusOf, resolveEventId } from '@/lib/events/booking';

/**
 * The event a digest link acts on. Links issued before the move to events carry an agreement
 * id; those resolve to the agreement's event.
 */
export async function loadBalanceActionEvent(id: string) {
  const eventId = await resolveEventId(id);
  if (!eventId) return null;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      archived: true,
      cancelledAt: true,
      paymentStatus: true,
      stripePaymentLink: true,
      eventDate: true,
      client: { select: { firstName: true, lastName: true, emailGreetingName: true, email: true } },
    },
  });
  if (!event) return null;
  return { ...event, status: bookingStatusOf(event.status), event: { eventDate: event.eventDate } };
}
