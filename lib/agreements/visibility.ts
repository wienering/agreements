/**
 * A draft that has never gone out to the client: not emailed and never opened.
 * These live on the Events page only; the Agreements page shows agreements a
 * client has actually received.
 */
export function isUnsentDraft(agreement: {
  status: string;
  emailSendCount?: number | null;
  lastEmailedAt?: string | Date | null;
  firstViewedAt?: string | Date | null;
}): boolean {
  return (
    agreement.status === 'DRAFT' &&
    !(agreement.emailSendCount && agreement.emailSendCount > 0) &&
    !agreement.lastEmailedAt &&
    !agreement.firstViewedAt
  );
}
