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

/**
 * invoiceType stored in Stripe invoice metadata:
 * - deposit / remaining: the two invoices of the default option when the event is more than 7 days out
 * - full: one invoice for the whole amount
 * - minus-deposit: "Total minus $100 deposit" (the deposit was paid some other way)
 * - custom: "Custom amount" (may be a part payment)
 * Invoices sent before minus-deposit and custom existed are labelled full.
 */
export type StripeInvoiceType = 'deposit' | 'remaining' | 'full' | 'minus-deposit' | 'custom' | string | undefined;

export type InvoiceOption = 'default' | 'total-only' | 'total-minus-deposit' | 'custom-amount';

/** The invoiceType label for the single (or second) invoice the invoice route creates. */
export function stripeInvoiceTypeFor(option: InvoiceOption, needsTwoInvoices: boolean): 'remaining' | 'full' | 'minus-deposit' | 'custom' {
  if (needsTwoInvoices) return 'remaining';
  if (option === 'custom-amount') return 'custom';
  if (option === 'total-minus-deposit') return 'minus-deposit';
  return 'full';
}

/**
 * The payment status to store after a Stripe invoice is paid, or null to leave it as it is.
 * Writes only the dropdown's own values. Never downgrades a fully paid agreement.
 * Remaining-balance and minus-deposit invoices only mean fully paid when the deposit is already
 * recorded. Custom amounts may be part payments, so they never change the status. When null is
 * returned the webhook alerts on Telegram, so no follow-up email starts on a guess.
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
    case 'minus-deposit':
      return isDepositPaid(currentStatus) ? PAYMENT_STATUS_FULLY_PAID : null;
    case 'full':
      return PAYMENT_STATUS_FULLY_PAID;
    case 'custom':
      return null;
    default:
      return null;
  }
}
