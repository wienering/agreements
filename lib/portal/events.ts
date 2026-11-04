import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { displayPaymentStatus } from '@/lib/paymentStatus';
import { isSigned } from '@/lib/agreementStatus';
import { isSignableStatus } from '@/lib/agreements/signable';
import { isUnsentDraft } from '@/lib/agreements/visibility';
import { extractAttendantIdFromUrl } from '@/app/admin/agreements/_components/agreementUtils';

/** Prisma filter for a draft the client has never been sent (see isUnsentDraft). */
export const UNSENT_DRAFT_WHERE: Prisma.AgreementWhereInput = {
  status: 'DRAFT',
  emailSendCount: 0,
  lastEmailedAt: null,
  firstViewedAt: null,
};

const portalEventSelect = {
  id: true,
  status: true,
  eventDate: true,
  eventType: true,
  eventName: true,
  eventLocation: true,
  eventStartTime: true,
  eventDuration: true,
  eventPackage: true,
  paymentStatus: true,
  stripePaymentLink: true,
  stripeReceiptLink: true,
  galleryLinks: true,
  galleryEmailSentAt: true,
  selectedBackdropName: true,
  forceVirtualGreenScreen: true,
  backdropLink: { select: { url: true } },
  agreements: {
    where: { archived: false },
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      status: true,
      emailSendCount: true,
      lastEmailedAt: true,
      firstViewedAt: true,
      signedAt: true,
      expiresAt: true,
      template: { select: { title: true } },
    },
  },
} satisfies Prisma.EventSelect;

type PortalEventRow = Prisma.EventGetPayload<{ select: typeof portalEventSelect }>;

export type PortalEvent = ReturnType<typeof toPortalEvent>;

function toPortalEvent(event: PortalEventRow) {
  const attendantId = event.backdropLink?.url ? extractAttendantIdFromUrl(event.backdropLink.url) : null;
  const galleryLinks = Array.isArray(event.galleryLinks)
    ? (event.galleryLinks as Array<{ title?: string; url?: string }>).filter((g) => g?.url?.trim())
    : [];
  return {
    id: event.id,
    status: event.status,
    eventDate: event.eventDate,
    eventType: event.eventType,
    eventName: event.eventName,
    eventLocation: event.eventLocation,
    eventStartTime: event.eventStartTime,
    eventDuration: event.eventDuration,
    eventPackage: event.eventPackage,
    paymentStatus: displayPaymentStatus(event.paymentStatus),
    stripePaymentLink: event.stripePaymentLink,
    stripeReceiptLink: event.stripeReceiptLink,
    // Galleries show once the gallery email has gone out, so the client never sees a half-finished one.
    galleryLinks: event.galleryEmailSentAt ? galleryLinks.map((g) => ({ title: g.title || 'Photo Gallery', url: g.url as string })) : [],
    backdrop: {
      canChoose: Boolean(attendantId) && event.status === 'UPCOMING',
      selectedName: event.selectedBackdropName,
    },
    // Only agreements the client has been sent. A draft nobody sent them stays hidden.
    agreements: event.agreements
      .filter((agreement) => !isUnsentDraft(agreement))
      .map((agreement) => ({
        id: agreement.id,
        title: agreement.template.title,
        status: agreement.status,
        isSigned: isSigned(agreement.status),
        canSign: isSignableStatus(agreement.status),
        signedAt: agreement.signedAt,
        expiresAt: agreement.expiresAt,
      })),
  };
}

/** Every live event for the client's email (repeat clients can have several client records). */
export async function loadPortalEvents(email: string) {
  const events = await prisma.event.findMany({
    where: {
      archived: false,
      status: { not: 'CANCELLED' },
      client: { email: { equals: email.toLowerCase(), mode: 'insensitive' } },
    },
    orderBy: { eventDate: 'asc' },
    select: portalEventSelect,
  });
  return events.map(toPortalEvent);
}

/** One event, only if it belongs to the client's email. */
export async function loadPortalEvent(email: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      archived: false,
      status: { not: 'CANCELLED' },
      client: { email: { equals: email.toLowerCase(), mode: 'insensitive' } },
    },
    select: portalEventSelect,
  });
  return event ? toPortalEvent(event) : null;
}

/** The attendant behind the event's backdrop link, for loading backdrop choices. */
export async function portalEventAttendantId(email: string, eventId: string): Promise<string | null> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      archived: false,
      status: 'UPCOMING',
      client: { email: { equals: email.toLowerCase(), mode: 'insensitive' } },
    },
    select: { backdropLink: { select: { url: true } } },
  });
  return event?.backdropLink?.url ? extractAttendantIdFromUrl(event.backdropLink.url) : null;
}
