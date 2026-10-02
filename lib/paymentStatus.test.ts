import { describe, expect, it } from 'vitest';
import {
  isDepositPaid,
  isFullyPaid,
  paymentStatusAfterStripeInvoice,
  stripeInvoiceTypeFor,
} from '@/lib/paymentStatus';

describe('isFullyPaid', () => {
  it.each(['Fully paid', 'Fully Paid', 'FULLY PAID', '  fully   paid ', 'Paid', 'paid', 'Balance Paid', 'balance paid'])(
    'treats %j as fully paid',
    (status) => {
      expect(isFullyPaid(status)).toBe(true);
    },
  );

  it.each([null, undefined, '', '  ', 'Not paid', 'Not Paid', 'Deposit paid', 'Deposit Paid', 'Balance due', 'Invoice issued', 'Unpaid', 'Partially paid'])(
    'treats %j as owing',
    (status) => {
      expect(isFullyPaid(status)).toBe(false);
    },
  );
});

describe('isDepositPaid', () => {
  it('ignores capitalisation and spacing', () => {
    expect(isDepositPaid('Deposit paid')).toBe(true);
    expect(isDepositPaid('Deposit Paid')).toBe(true);
    expect(isDepositPaid(' deposit  PAID ')).toBe(true);
    expect(isDepositPaid('Fully paid')).toBe(false);
    expect(isDepositPaid(null)).toBe(false);
  });
});

describe('stripeInvoiceTypeFor', () => {
  it('labels each invoice option', () => {
    expect(stripeInvoiceTypeFor('default', true)).toBe('remaining');
    expect(stripeInvoiceTypeFor('default', false)).toBe('full');
    expect(stripeInvoiceTypeFor('total-only', false)).toBe('full');
    expect(stripeInvoiceTypeFor('total-minus-deposit', false)).toBe('minus-deposit');
    expect(stripeInvoiceTypeFor('custom-amount', false)).toBe('custom');
  });
});

describe('paymentStatusAfterStripeInvoice', () => {
  it('records a paid deposit with the dropdown value', () => {
    expect(paymentStatusAfterStripeInvoice('deposit', null)).toBe('Deposit paid');
    expect(paymentStatusAfterStripeInvoice('deposit', 'Invoice issued')).toBe('Deposit paid');
  });

  it('upgrades a recorded deposit to Fully paid, whatever its capitalisation', () => {
    expect(paymentStatusAfterStripeInvoice('remaining', 'Deposit paid')).toBe('Fully paid');
    expect(paymentStatusAfterStripeInvoice('remaining', 'Deposit Paid')).toBe('Fully paid');
  });

  it('leaves the status alone when a remaining balance is paid without a recorded deposit', () => {
    expect(paymentStatusAfterStripeInvoice('remaining', 'Invoice issued')).toBeNull();
    expect(paymentStatusAfterStripeInvoice('remaining', null)).toBeNull();
  });

  it('records a full invoice as Fully paid', () => {
    expect(paymentStatusAfterStripeInvoice('full', null)).toBe('Fully paid');
    expect(paymentStatusAfterStripeInvoice('full', 'Invoice issued')).toBe('Fully paid');
  });

  it('leaves the status alone for an unknown invoice type', () => {
    expect(paymentStatusAfterStripeInvoice(undefined, 'Invoice issued')).toBeNull();
    expect(paymentStatusAfterStripeInvoice('something-else', null)).toBeNull();
  });

  it('never downgrades a fully paid agreement, and tidies old spellings to the dropdown value', () => {
    expect(paymentStatusAfterStripeInvoice('deposit', 'Fully paid')).toBeNull();
    expect(paymentStatusAfterStripeInvoice('deposit', 'Fully Paid')).toBe('Fully paid');
    expect(paymentStatusAfterStripeInvoice('remaining', 'Balance Paid')).toBe('Fully paid');
  });

  it('leaves custom amounts alone: they may be part payments', () => {
    for (const current of [null, 'Invoice issued', 'Deposit paid', 'Balance due', 'Not paid']) {
      expect(paymentStatusAfterStripeInvoice('custom', current)).toBeNull();
    }
  });

  it('treats a minus-deposit invoice like a remaining balance', () => {
    expect(paymentStatusAfterStripeInvoice('minus-deposit', 'Deposit paid')).toBe('Fully paid');
    expect(paymentStatusAfterStripeInvoice('minus-deposit', 'Deposit Paid')).toBe('Fully paid');
    expect(paymentStatusAfterStripeInvoice('minus-deposit', null)).toBeNull();
    expect(paymentStatusAfterStripeInvoice('minus-deposit', 'Invoice issued')).toBeNull();
  });

  it('never returns "Balance Paid" or "Paid"', () => {
    const types = ['deposit', 'remaining', 'full', 'minus-deposit', 'custom', undefined, 'other'];
    const currents = [null, '', 'Not paid', 'Invoice issued', 'Deposit paid', 'Deposit Paid', 'Balance due', 'Fully paid', 'Fully Paid', 'Paid', 'Balance Paid'];
    for (const type of types) {
      for (const current of currents) {
        const next = paymentStatusAfterStripeInvoice(type, current);
        expect([null, 'Deposit paid', 'Fully paid']).toContain(next);
      }
    }
  });
});
