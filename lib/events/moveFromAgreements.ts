/**
 * Plans the 2026-11 move of booking data from agreements onto events.
 *
 * In scope: every non-archived agreement whose event is today or later in Toronto, or has no
 * date at all. Past bookings are left exactly as they are.
 *
 * Agreements are grouped by event. An agreement with no Event record gets one built from the
 * client's legacy event fields. Each group's booking data (payment, attendant, gallery,
 * follow-ups...) is copied from its primary agreement: the signed one if any, otherwise the
 * newest. Drafts that never went to the client are archived once their event holds the data;
 * every other agreement stays linked and stays in the Agreements section.
 */
import { torontoDateKey } from '@/lib/dates';
import { isUnsentDraft } from '@/lib/agreements/visibility';
import { normalizePaymentStatus, DEFAULT_PAYMENT_STATUS } from '@/lib/paymentStatus';

export type LegacyEventFields = {
  eventDate: Date | null;
  eventType: string | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
  packagePrice: unknown;
};

/** Booking fields copied from an agreement onto its event. */
export const BOOKING_FIELDS = [
  'paymentStatus',
  'stripePaymentLink',
  'stripeReceiptLink',
  'galleryLinks',
  'galleryEmailSentAt',
  'reviewRequestSentAt',
  'nextAction',
  'backdropLinkId',
  'selectedBackdropName',
  'showPhoneNumberAlways',
  'forceVirtualGreenScreen',
  'balanceDigestSnoozedUntil',
  'balanceReminderSentAt',
  'followUpsPaused',
  'reviewReceived',
  'galleryHeldAlertAt',
  'notesLastViewedAt',
] as const;
export type BookingField = (typeof BOOKING_FIELDS)[number];

export type MoveAgreement = {
  id: string;
  status: string;
  createdAt: Date;
  eventId: string | null;
  emailSendCount: number;
  lastEmailedAt: Date | null;
  firstViewedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  // Booking fields
  paymentStatus: string | null;
  stripePaymentLink: string | null;
  stripeReceiptLink: string | null;
  galleryLink: string | null;
  galleryLinks: unknown;
  galleryEmailSentAt: Date | null;
  reviewRequestSentAt: Date | null;
  nextAction: string | null;
  backdropLinkId: string | null;
  selectedBackdropName: string | null;
  showPhoneNumberAlways: boolean;
  forceVirtualGreenScreen: boolean;
  balanceDigestSnoozedUntil: Date | null;
  balanceReminderSentAt: Date | null;
  followUpsPaused: boolean;
  reviewReceived: boolean;
  galleryHeldAlertAt: Date | null;
  notesLastViewedAt: Date | null;
  client: { id: string; firstName: string; lastName: string } & LegacyEventFields;
  event: ({ id: string; archived: boolean; movedAlready: boolean } & LegacyEventFields) | null;
};

export type EventStatusValue = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export type MovePlan = {
  /** Existing event id, or null when one must be created from `newEvent`. */
  eventId: string | null;
  newEvent: (LegacyEventFields & { clientId: string }) | null;
  clientName: string;
  dateKey: string | null;
  primaryAgreementId: string;
  agreementIds: string[];
  /** The event already went through this move; nothing is copied again. */
  alreadyMoved: boolean;
  booking: Record<BookingField, unknown>;
  status: EventStatusValue;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  /** Unsent drafts archived after the copy. */
  archiveAgreementIds: string[];
  /** The event was archived and comes back (it has live agreements in scope). */
  unarchiveEvent: boolean;
  /** Booking values on other agreements in the group that differ from the primary's. */
  conflicts: string[];
};

const FULLY_SIGNED = new Set(['SIGNED', 'COMPLETED']);

function primaryOf(group: MoveAgreement[]): MoveAgreement {
  return [...group].sort((a, b) => {
    const aSigned = FULLY_SIGNED.has(a.status) ? 1 : 0;
    const bSigned = FULLY_SIGNED.has(b.status) ? 1 : 0;
    if (aSigned !== bSigned) return bSigned - aSigned;
    const aLive = a.status === 'CANCELLED' ? 0 : 1;
    const bLive = b.status === 'CANCELLED' ? 0 : 1;
    if (aLive !== bLive) return bLive - aLive;
    const byCreated = b.createdAt.getTime() - a.createdAt.getTime();
    return byCreated !== 0 ? byCreated : a.id < b.id ? 1 : -1;
  })[0];
}

function galleryLinksOf(agreement: MoveAgreement): unknown {
  if (Array.isArray(agreement.galleryLinks) && agreement.galleryLinks.length > 0) return agreement.galleryLinks;
  if (agreement.galleryLink) return [{ title: 'Photo Gallery', url: agreement.galleryLink }];
  return null;
}

function bookingOf(agreement: MoveAgreement): Record<BookingField, unknown> {
  return {
    paymentStatus: normalizePaymentStatus(agreement.paymentStatus) ?? DEFAULT_PAYMENT_STATUS,
    stripePaymentLink: agreement.stripePaymentLink,
    stripeReceiptLink: agreement.stripeReceiptLink,
    galleryLinks: galleryLinksOf(agreement),
    galleryEmailSentAt: agreement.galleryEmailSentAt,
    reviewRequestSentAt: agreement.reviewRequestSentAt,
    nextAction: agreement.nextAction,
    backdropLinkId: agreement.backdropLinkId,
    selectedBackdropName: agreement.selectedBackdropName,
    showPhoneNumberAlways: agreement.showPhoneNumberAlways,
    forceVirtualGreenScreen: agreement.forceVirtualGreenScreen,
    balanceDigestSnoozedUntil: agreement.balanceDigestSnoozedUntil,
    balanceReminderSentAt: agreement.balanceReminderSentAt,
    followUpsPaused: agreement.followUpsPaused,
    reviewReceived: agreement.reviewReceived,
    galleryHeldAlertAt: agreement.galleryHeldAlertAt,
    notesLastViewedAt: agreement.notesLastViewedAt,
  };
}

const IS_DEFAULT: Record<BookingField, (value: unknown) => boolean> = Object.fromEntries(
  BOOKING_FIELDS.map((field) => [
    field,
    field === 'paymentStatus'
      ? (value: unknown) => value === DEFAULT_PAYMENT_STATUS
      : (value: unknown) => value === null || value === undefined || value === false,
  ]),
) as Record<BookingField, (value: unknown) => boolean>;

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return JSON.stringify(a) === JSON.stringify(b);
}

function eventDateOf(agreement: MoveAgreement): Date | null {
  return agreement.event?.eventDate ?? agreement.client.eventDate ?? null;
}

export function planMoveToEvents(agreements: MoveAgreement[], todayKey: string): MovePlan[] {
  const inScope = agreements.filter((agreement) => {
    const date = eventDateOf(agreement);
    return !date || torontoDateKey(date) >= todayKey;
  });

  const groups = new Map<string, MoveAgreement[]>();
  for (const agreement of inScope) {
    const key = agreement.eventId ? `event:${agreement.eventId}` : `agreement:${agreement.id}`;
    groups.set(key, [...(groups.get(key) ?? []), agreement]);
  }

  return [...groups.values()].map((group) => {
    const primary = primaryOf(group);
    const booking = bookingOf(primary);
    const date = eventDateOf(primary);

    // Fill a blank on the primary from another agreement in the group, and note real disagreements.
    const conflicts: string[] = [];
    for (const other of group) {
      if (other.id === primary.id) continue;
      const otherBooking = bookingOf(other);
      for (const field of BOOKING_FIELDS) {
        if (IS_DEFAULT[field](otherBooking[field])) continue;
        if (IS_DEFAULT[field](booking[field])) {
          booking[field] = otherBooking[field];
        } else if (!sameValue(booking[field], otherBooking[field])) {
          conflicts.push(`${field}: kept ${JSON.stringify(booking[field])} (from ${primary.id}), not ${JSON.stringify(otherBooking[field])} (from ${other.id})`);
        }
      }
    }

    const live = group.filter((agreement) => agreement.status !== 'CANCELLED');
    let status: EventStatusValue = 'UPCOMING';
    if (live.length === 0) status = 'CANCELLED';
    else if (live.some((agreement) => agreement.status === 'COMPLETED')) status = 'COMPLETED';
    const cancelledSource = status === 'CANCELLED' ? primary : null;

    const legacy: LegacyEventFields = {
      eventDate: primary.client.eventDate,
      eventType: primary.client.eventType,
      eventLocation: primary.client.eventLocation,
      eventStartTime: primary.client.eventStartTime,
      eventDuration: primary.client.eventDuration,
      eventPackage: primary.client.eventPackage,
      packagePrice: primary.client.packagePrice,
    };

    return {
      eventId: primary.eventId,
      newEvent: primary.eventId ? null : { ...legacy, clientId: primary.client.id },
      clientName: `${primary.client.firstName} ${primary.client.lastName}`.trim(),
      dateKey: date ? torontoDateKey(date) : null,
      primaryAgreementId: primary.id,
      agreementIds: group.map((agreement) => agreement.id),
      alreadyMoved: Boolean(primary.event?.movedAlready),
      booking,
      status,
      cancelledAt: cancelledSource?.cancelledAt ?? null,
      cancellationReason: cancelledSource?.cancellationReason ?? null,
      archiveAgreementIds: group.filter((agreement) => isUnsentDraft(agreement)).map((agreement) => agreement.id),
      unarchiveEvent: Boolean(primary.event?.archived),
      conflicts,
    };
  });
}
