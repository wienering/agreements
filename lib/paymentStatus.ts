/** The payment status values the admin drawer dropdown writes. */
export const PAYMENT_STATUS_DEPOSIT_PAID = 'Deposit paid';
export const PAYMENT_STATUS_FULLY_PAID = 'Fully paid';

/** Lowercase with single spaces, so "Fully  Paid " and "fully paid" compare equal. */
function paymentStatusKey(status: string | null | undefined): string {
  return (status ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * True when nothing is owing. Ignores capitalisation and extra spaces. Also accepts the
 * older Stripe values "Paid" and "Balance Paid", which mean the same thing.
 */
export function isFullyPaid(status: string | null | undefined): boolean {
  const key = paymentStatusKey(status);
  return key === 'fully paid' || key === 'paid' || key === 'balance paid';
}

export function isDepositPaid(status: string | null | undefined): boolean {
  return paymentStatusKey(status) === 'deposit paid';
}

export type StripeInvoiceType = 'deposit' | 'remaining' | 'full' | string | undefined;

/**
 * The payment status to store after a Stripe invoice is paid, or null to leave it as it is.
 * Writes only the dropdown's own values. Never downgrades a fully paid agreement.
 * A remaining-balance invoice only means fully paid when the deposit is already recorded;
 * otherwise the status is left for a person to set, so no follow-up email starts on a guess.
 */
export function paymentStatusAfterStripeInvoice(
  invoiceType: StripeInvoiceType,
  currentStatus: string | null | undefined,
): string | null {
  if (isFullyPaid(currentStatus)) {
    return currentStatus === PAYMENT_STATUS_FULLY_PAID ? null : PAYMENT_STATUS_FULLY_PAID;
  }
  switch (invoiceType) {
    case 'deposit':
      return PAYMENT_STATUS_DEPOSIT_PAID;
    case 'remaining':
      return isDepositPaid(currentStatus) ? PAYMENT_STATUS_FULLY_PAID : null;
    case 'full':
      return PAYMENT_STATUS_FULLY_PAID;
    default:
      return null;
  }
}
