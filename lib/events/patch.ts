import { queueCalendarSync } from '@/lib/googleCalendar/sync';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizePaymentStatus, PAYMENT_STATUSES } from '@/lib/paymentStatus';
import { logEventActivity } from '@/lib/events/booking';
import { setEventStatus } from '@/lib/events/status';

const galleryEntrySchema = z
  .object({
    title: z.string(),
    url: z.string().url('Invalid gallery link URL'),
  })
  .strict();

/** Any capitalisation of a list value (or the old "Paid" / "Balance Paid"), stored as the list value. */
const paymentStatusInputSchema = z.string().transform((value, ctx) => {
  if (!value.trim()) return undefined;
  const normalized = normalizePaymentStatus(value);
  if (!normalized) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}` });
    return z.NEVER;
  }
  return normalized;
});

/** Booking fields on an event. Every field is optional; unknown keys are rejected. */
export const eventBookingPatchSchema = z
  .object({
    galleryLinks: z.array(galleryEntrySchema).optional(),
    nextAction: z.string().max(500, 'Next action must be 500 characters or less').optional(),
    internalNotes: z.string().max(5000, 'Internal notes must be 5000 characters or less').optional(),
    paymentStatus: paymentStatusInputSchema.optional(),
    stripePaymentLink: z.string().url('Invalid payment link URL').optional().or(z.literal('')),
    stripeReceiptLink: z.string().url('Invalid receipt link URL').optional().or(z.literal('')),
    showPhoneNumberAlways: z.boolean().optional(),
    forceVirtualGreenScreen: z.boolean().optional(),
    backdropLinkId: z.string().nullable().optional(),
    selectedBackdropName: z.string().nullable().optional(),
    markNotesViewed: z.boolean().optional(),
    status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED']).optional(),
    cancellationReason: z.string().max(500).optional(),
  })
  .strict();

export type EventBookingPatch = z.infer<typeof eventBookingPatchSchema>;

export class EventPatchError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'EventPatchError';
    this.status = status;
  }
}

export function buildEventBookingData(input: EventBookingPatch, now: Date): Prisma.EventUncheckedUpdateInput {
  const data: Prisma.EventUncheckedUpdateInput = {};
  if (input.galleryLinks !== undefined) {
    data.galleryLinks = input.galleryLinks
      .filter((gallery) => gallery.url.trim())
      .map((gallery, index) => ({
        title: gallery.title.trim() || (index === 0 ? 'Photo Gallery' : `Gallery ${index + 1}`),
        url: gallery.url.trim(),
      }));
  }
  if (input.nextAction !== undefined) data.nextAction = input.nextAction || null;
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes.trim() || null;
  if (input.paymentStatus !== undefined) data.paymentStatus = input.paymentStatus;
  if (input.stripePaymentLink !== undefined) data.stripePaymentLink = input.stripePaymentLink || null;
  if (input.stripeReceiptLink !== undefined) data.stripeReceiptLink = input.stripeReceiptLink || null;
  if (input.showPhoneNumberAlways !== undefined) data.showPhoneNumberAlways = input.showPhoneNumberAlways;
  if (input.forceVirtualGreenScreen !== undefined) data.forceVirtualGreenScreen = input.forceVirtualGreenScreen;
  if (input.backdropLinkId !== undefined) data.backdropLinkId = input.backdropLinkId;
  if (input.selectedBackdropName !== undefined) data.selectedBackdropName = input.selectedBackdropName?.trim() || null;
  if (input.markNotesViewed) data.notesLastViewedAt = now;
  return data;
}

/** Apply booking changes, then a status change (which carries to the event's agreements). */
export async function patchEventBooking(id: string, body: unknown, now = new Date()) {
  const input = eventBookingPatchSchema.parse(body);
  const existing = await prisma.event.findUnique({ where: { id }, select: { id: true, paymentStatus: true } });
  if (!existing) throw new EventPatchError(404, 'Event not found');

  if (input.backdropLinkId) {
    const link = await prisma.backdropLink.findUnique({ where: { id: input.backdropLinkId }, select: { id: true } });
    if (!link) throw new EventPatchError(404, 'Backdrop link not found');
  }

  const data = buildEventBookingData(input, now);
  if (Object.keys(data).length > 0) {
    await prisma.event.update({ where: { id }, data });
    if (input.paymentStatus && input.paymentStatus !== existing.paymentStatus && input.paymentStatus === 'Fully paid') {
      await logEventActivity(id, 'PAYMENT_MARKED_PAID');
    }
  }

  if (input.status) {
    await setEventStatus(id, input.status, { now, reason: input.cancellationReason ?? null });
  }
  queueCalendarSync(id);
}
