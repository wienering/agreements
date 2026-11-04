/**
 * Booking data lives on the event. Agreement rows shown in the admin read it from their event,
 * so the Agreements page never shows a stale copy left on the agreement.
 */

export const eventWithBookingInclude = {
  include: {
    backdropLink: {
      select: {
        id: true,
        name: true,
        url: true,
        attendantId: true,
        attendant: { select: { id: true, name: true, active: true } },
      },
    },
  },
} as const;

type EventBooking = {
  paymentStatus: string;
  stripePaymentLink: string | null;
  stripeReceiptLink: string | null;
  galleryLinks: unknown;
  galleryEmailSentAt: Date | null;
  reviewRequestSentAt: Date | null;
  nextAction: string | null;
  backdropLinkId: string | null;
  backdropLink?: unknown;
  selectedBackdropName: string | null;
  showPhoneNumberAlways: boolean;
  forceVirtualGreenScreen: boolean;
  balanceDigestSnoozedUntil: Date | null;
  balanceReminderSentAt: Date | null;
  followUpsPaused: boolean;
  reviewReceived: boolean;
  galleryHeldAlertAt: Date | null;
};

export function withEventBooking<T extends { event?: (EventBooking & object) | null }>(agreement: T): T {
  const event = agreement.event;
  if (!event || !('paymentStatus' in event)) return agreement;
  const links = Array.isArray(event.galleryLinks) ? (event.galleryLinks as Array<{ url?: string }>) : [];
  return {
    ...agreement,
    paymentStatus: event.paymentStatus,
    stripePaymentLink: event.stripePaymentLink,
    stripeReceiptLink: event.stripeReceiptLink,
    galleryLinks: event.galleryLinks,
    galleryLink: links[0]?.url ?? null,
    galleryEmailSentAt: event.galleryEmailSentAt,
    reviewRequestSentAt: event.reviewRequestSentAt,
    nextAction: event.nextAction,
    backdropLinkId: event.backdropLinkId,
    backdropLink: event.backdropLink ?? null,
    selectedBackdropName: event.selectedBackdropName,
    showPhoneNumberAlways: event.showPhoneNumberAlways,
    forceVirtualGreenScreen: event.forceVirtualGreenScreen,
    balanceDigestSnoozedUntil: event.balanceDigestSnoozedUntil,
    balanceReminderSentAt: event.balanceReminderSentAt,
    followUpsPaused: event.followUpsPaused,
    reviewReceived: event.reviewReceived,
    galleryHeldAlertAt: event.galleryHeldAlertAt,
  } as T;
}
