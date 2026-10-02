import { isFullyPaid } from '@/lib/paymentStatus';

export type BalanceActionAgreementState = {
  paymentStatus: string | null;
  status: string;
  cancelledAt: Date | string | null;
  archived: boolean;
};

/** Why a digest action should be refused. Null means the action can proceed. */
export function balanceActionRefusal(agreement: BalanceActionAgreementState): string | null {
  if (isFullyPaid(agreement.paymentStatus)) {
    return 'This agreement is already paid. Nothing was changed.';
  }
  if (agreement.status === 'CANCELLED' || agreement.cancelledAt) {
    return 'This agreement is cancelled. Nothing was changed.';
  }
  if (agreement.archived) {
    return 'This agreement is archived. Nothing was changed.';
  }
  return null;
}
