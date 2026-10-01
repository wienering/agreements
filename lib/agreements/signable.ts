import type { AgreementStatus } from '@prisma/client';

/** Statuses that allow a new signature to be recorded. */
export const SIGNABLE_STATUSES: readonly AgreementStatus[] = ['DRAFT', 'SENT', 'LIVE'];

export function isSignableStatus(status: AgreementStatus): boolean {
  return status === 'DRAFT' || status === 'SENT' || status === 'LIVE';
}

/** True when there is no expiry, or the expiry is still in the future. */
export function isNotExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  return expiresAt === null || expiresAt >= now;
}

/**
 * An agreement is open for signing when its status is DRAFT, SENT, or LIVE
 * and expiresAt is null or still in the future.
 */
export function isOpenForSigning(
  agreement: { status: AgreementStatus; expiresAt: Date | null },
  now: Date = new Date(),
): boolean {
  return isSignableStatus(agreement.status) && isNotExpired(agreement.expiresAt, now);
}

export function isCancelledOrVoid(status: AgreementStatus): boolean {
  return status === 'CANCELLED' || status === 'VOID';
}
