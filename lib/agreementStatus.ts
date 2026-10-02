/** Statuses where the client has signed: SIGNED, and COMPLETED (signed, and the event is done). */
export const SIGNED_STATUSES = ['SIGNED', 'COMPLETED'] as const;

export function isSigned(status: string | null | undefined): boolean {
  return (SIGNED_STATUSES as readonly string[]).includes(status ?? '');
}

/** The statuses an admin can pick by hand. */
export const MANUAL_STATUSES = ['DRAFT', 'SENT', 'SIGNED', 'COMPLETED', 'CANCELLED'] as const;
export type ManualStatus = (typeof MANUAL_STATUSES)[number];

/** Where a signed agreement may move by hand. It never goes back to DRAFT or SENT. */
const SIGNED_TRANSITIONS: Record<string, readonly ManualStatus[]> = {
  SIGNED: ['SIGNED', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED', 'SIGNED', 'CANCELLED'],
};

/** Statuses reachable by hand from an unsigned agreement. Cancelling one is done by archiving. */
const UNSIGNED_TARGETS: readonly ManualStatus[] = ['DRAFT', 'SENT', 'SIGNED', 'COMPLETED'];

/** Null when the manual change is allowed, otherwise the reason it isn't. */
export function manualStatusChangeError(from: string, to: ManualStatus): string | null {
  const signedTargets = SIGNED_TRANSITIONS[from];
  if (signedTargets) {
    return signedTargets.includes(to)
      ? null
      : `A ${from.toLowerCase()} agreement can only move to ${signedTargets.filter((s) => s !== from).join(' or ')}. Once an agreement is signed, it becomes legally binding.`;
  }
  if (from === 'CANCELLED') return null;
  return UNSIGNED_TARGETS.includes(to) ? null : 'Only signed or completed agreements can be marked CANCELLED here. Archive an unsigned agreement instead.';
}

/** Display label for a status. */
export function agreementStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'SENT':
      return 'Sent';
    case 'SIGNED':
      return 'Signed';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}
