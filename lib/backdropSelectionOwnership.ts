import { prisma } from '@/lib/prisma';
import {
  isValidAttendantCuid,
  backdropLinkUrlConditionsForAttendant,
  urlContainsBoundedAttendantId,
} from '@/lib/attendantIdentity';

/** Prisma default cuid: 'c' + 24 lowercase alphanumeric chars (25 total). */
const CUID_RE = /^c[a-z0-9]{24}$/;

export function isValidAgreementCuid(id: string): boolean {
  return CUID_RE.test(id);
}

export type BackdropOwnershipFailureReason =
  | 'invalid_agreement_id'
  | 'invalid_attendant_id'
  | 'missing_attendant_id'
  | 'agreement_not_found'
  | 'ownership_mismatch_attendant'
  | 'ownership_mismatch_email';

export type BackdropOwnershipResult =
  | { ok: true; agreementId: string }
  | { ok: false; reason: BackdropOwnershipFailureReason };

function writableAgreementWhere(agreementId: string) {
  return {
    id: agreementId,
    archived: false,
    status: { not: 'CANCELLED' as const },
  };
}

/**
 * Binds a client-supplied agreementId to the backdrop selection context.
 * Uses the same bounded attendant token matching as the attendant hub.
 */
export async function verifyBackdropSelectionOwnership(params: {
  agreementId: string;
  attendantId: string;
  clientEmail: string;
}): Promise<BackdropOwnershipResult> {
  const { agreementId, attendantId, clientEmail } = params;

  if (!isValidAgreementCuid(agreementId)) {
    return { ok: false, reason: 'invalid_agreement_id' };
  }

  if (!isValidAttendantCuid(attendantId)) {
    return { ok: false, reason: 'invalid_attendant_id' };
  }

  const backdropLinks = await prisma.backdropLink.findMany({
    where: {
      OR: backdropLinkUrlConditionsForAttendant(attendantId),
    },
    select: { id: true, url: true },
  });

  const backdropLinkIds = backdropLinks
    .filter((link) => urlContainsBoundedAttendantId(link.url, attendantId))
    .map((link) => link.id);

  if (backdropLinkIds.length === 0) {
    return { ok: false, reason: 'ownership_mismatch_attendant' };
  }

  const agreement = await prisma.agreement.findFirst({
    where: {
      ...writableAgreementWhere(agreementId),
      backdropLinkId: { in: backdropLinkIds },
    },
    select: {
      id: true,
      client: { select: { email: true } },
    },
  });

  if (!agreement) {
    const exists = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { id: true, archived: true, status: true, backdropLinkId: true },
    });

    if (!exists || exists.archived || exists.status === 'CANCELLED') {
      return { ok: false, reason: 'agreement_not_found' };
    }

    return { ok: false, reason: 'ownership_mismatch_attendant' };
  }

  const normalizedSubmitted = clientEmail.trim().toLowerCase();
  const normalizedStored = agreement.client.email.trim().toLowerCase();
  if (normalizedSubmitted !== normalizedStored) {
    return { ok: false, reason: 'ownership_mismatch_email' };
  }

  return { ok: true, agreementId: agreement.id };
}
