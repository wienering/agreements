import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { findAgreementListItem } from '@/lib/agreements/listItem';

const galleryEntrySchema = z
  .object({
    title: z.string(),
    url: z.string().url('Invalid gallery link URL'),
  })
  .strict();

const SIGNED_STATUS_TRANSITIONS = ['COMPLETED', 'CANCELLED'];

const SIGNED_STATUS_ERROR =
  'Cannot change status of signed agreements except to COMPLETED or CANCELLED. Once an agreement is signed, it becomes legally binding.';

/**
 * Every field is optional. Unknown keys are rejected.
 * Field rules match the existing single-purpose admin routes.
 */
export const agreementPatchSchema = z
  .object({
    expiresAt: z.string().min(1, 'Expiration date is required').optional(),
    galleryLink: z.string().url('Invalid gallery link URL').or(z.literal('')).optional(),
    galleryLinks: z.array(galleryEntrySchema).optional(),
    nextAction: z.string().max(500, 'Next action must be 500 characters or less').optional(),
    paymentStatus: z.string().optional(),
    stripePaymentLink: z.string().url('Invalid payment link URL').optional().or(z.literal('')),
    stripeReceiptLink: z.string().url('Invalid receipt link URL').optional().or(z.literal('')),
    showPhoneNumberAlways: z.boolean().optional(),
    forceVirtualGreenScreen: z.boolean().optional(),
    chaserPaused: z.boolean().optional(),
    backdropLinkId: z.string().nullable().optional(),
    markNotesViewed: z.boolean().optional(),
    status: z
      .enum(['DRAFT', 'LIVE', 'SIGNED', 'COMPLETED'], {
        errorMap: () => ({ message: 'Status must be DRAFT, LIVE, SIGNED, or COMPLETED' }),
      })
      .optional(),
  })
  .strict();

export type AgreementPatch = z.infer<typeof agreementPatchSchema>;

export class AgreementPatchError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AgreementPatchError';
    this.status = status;
  }
}

export type PatchAgreementOptions = {
  now?: () => Date;
};

function galleryLinksFromPatch(input: AgreementPatch) {
  const rawLinks =
    input.galleryLinks && input.galleryLinks.length > 0
      ? input.galleryLinks
      : input.galleryLink
        ? [{ title: 'Photo Gallery', url: input.galleryLink }]
        : [];

  return rawLinks.map((gallery, index) => ({
    title: (gallery.title || '').trim() || (index === 0 ? 'Photo Gallery' : `Gallery ${index + 1}`),
    url: gallery.url,
  }));
}

export function buildAgreementPatchData(
  input: AgreementPatch,
  now: Date,
): Prisma.AgreementUncheckedUpdateInput {
  const data: Prisma.AgreementUncheckedUpdateInput = {};

  if (input.expiresAt !== undefined) {
    data.expiresAt = new Date(input.expiresAt);
  }

  if (input.galleryLink !== undefined || input.galleryLinks !== undefined) {
    const galleryLinksData = galleryLinksFromPatch(input);
    data.galleryLinks = galleryLinksData;
    data.galleryLink = galleryLinksData.length > 0 ? galleryLinksData[0].url : null;
  }

  if (input.nextAction !== undefined) {
    data.nextAction = input.nextAction || null;
  }

  if (input.paymentStatus !== undefined) {
    data.paymentStatus = input.paymentStatus || null;
  }

  if (input.stripePaymentLink !== undefined) {
    data.stripePaymentLink = input.stripePaymentLink || null;
  }

  if (input.stripeReceiptLink !== undefined) {
    data.stripeReceiptLink = input.stripeReceiptLink || null;
  }

  if (input.showPhoneNumberAlways !== undefined) {
    data.showPhoneNumberAlways = input.showPhoneNumberAlways;
  }

  if (input.forceVirtualGreenScreen !== undefined) {
    data.forceVirtualGreenScreen = input.forceVirtualGreenScreen;
  }

  if (input.chaserPaused !== undefined) {
    data.chaserPaused = input.chaserPaused;
  }

  if (input.backdropLinkId !== undefined) {
    data.backdropLinkId = input.backdropLinkId;
  }

  if (input.markNotesViewed) {
    data.notesLastViewedAt = now;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  return data;
}

function isConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return candidate.code === 'P2002' || (typeof candidate.message === 'string' && candidate.message.includes('constraint'));
}

export async function patchAgreement(id: string, body: unknown, options: PatchAgreementOptions = {}) {
  const input = agreementPatchSchema.parse(body);
  const now = options.now ?? (() => new Date());

  const existing = await prisma.agreement.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new AgreementPatchError(404, 'Agreement not found');
  }

  if (
    input.status !== undefined &&
    existing.status === 'SIGNED' &&
    !SIGNED_STATUS_TRANSITIONS.includes(input.status)
  ) {
    console.error(
      'Attempted to change status of signed agreement:',
      id,
      'from',
      existing.status,
      'to',
      input.status,
    );
    throw new AgreementPatchError(403, SIGNED_STATUS_ERROR);
  }

  if (input.backdropLinkId) {
    const backdropLink = await prisma.backdropLink.findUnique({
      where: { id: input.backdropLinkId },
    });

    if (!backdropLink) {
      throw new AgreementPatchError(404, 'Backdrop link not found');
    }
  }

  const data = buildAgreementPatchData(input, now());

  if (Object.keys(data).length > 0) {
    try {
      await prisma.agreement.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (input.status !== undefined && isConstraintError(error)) {
        throw new AgreementPatchError(400, 'Database constraint error - status may not be valid');
      }
      throw error;
    }
  }

  const agreement = await findAgreementListItem(id);
  if (!agreement) {
    throw new AgreementPatchError(404, 'Agreement not found');
  }

  return agreement;
}
