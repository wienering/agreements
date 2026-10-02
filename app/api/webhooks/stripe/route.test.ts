import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  prisma: { agreement: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: mocks.constructEvent };
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));

import { POST } from '@/app/api/webhooks/stripe/route';

function paidInvoiceEvent(invoiceType?: string) {
  return {
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_1',
        metadata: { agreementId: 'agr_1', ...(invoiceType ? { invoiceType } : {}) },
        hosted_invoice_url: 'https://stripe.example/receipt',
      },
    },
  };
}

async function deliver(invoiceType: string | undefined, currentPaymentStatus: string | null) {
  mocks.constructEvent.mockReturnValue(paidInvoiceEvent(invoiceType));
  mocks.prisma.agreement.findUnique.mockResolvedValue({
    id: 'agr_1',
    paymentStatus: currentPaymentStatus,
    client: { email: 'jane@example.com' },
  });
  const request = new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body: '{}',
    headers: { 'stripe-signature': 'sig' },
  });
  return POST(request);
}

const writtenPaymentStatus = () => mocks.prisma.agreement.update.mock.calls[0]?.[0]?.data?.paymentStatus;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Stripe webhook payment status', () => {
  it('writes "Deposit paid" for a paid deposit', async () => {
    const response = await deliver('deposit', null);
    expect(response.status).toBe(200);
    expect(writtenPaymentStatus()).toBe('Deposit paid');
  });

  it('upgrades a dropdown "Deposit paid" to "Fully paid" when the balance is paid', async () => {
    await deliver('remaining', 'Deposit paid');
    expect(writtenPaymentStatus()).toBe('Fully paid');
  });

  it('upgrades an old "Deposit Paid" the same way', async () => {
    await deliver('remaining', 'Deposit Paid');
    expect(writtenPaymentStatus()).toBe('Fully paid');
  });

  it('writes "Fully paid" for a full invoice', async () => {
    await deliver('full', 'Invoice issued');
    expect(writtenPaymentStatus()).toBe('Fully paid');
  });

  it('keeps the status but saves the receipt when a balance is paid without a recorded deposit', async () => {
    const response = await deliver('remaining', 'Invoice issued');
    const data = mocks.prisma.agreement.update.mock.calls[0][0].data;
    expect(data).toEqual({ stripeReceiptLink: 'https://stripe.example/receipt' });
    expect((await response.json()).paymentStatus).toBe('Invoice issued');
  });

  it('keeps the status for an unknown invoice type', async () => {
    await deliver(undefined, 'Invoice issued');
    expect(mocks.prisma.agreement.update.mock.calls[0][0].data).not.toHaveProperty('paymentStatus');
  });

  it('never writes "Balance Paid" or "Paid"', async () => {
    for (const type of ['deposit', 'remaining', 'full', undefined]) {
      for (const current of [null, 'Not paid', 'Invoice issued', 'Deposit paid', 'Balance due', 'Fully Paid']) {
        vi.clearAllMocks();
        await deliver(type, current);
        const written = writtenPaymentStatus();
        expect(written === undefined || written === 'Deposit paid' || written === 'Fully paid').toBe(true);
      }
    }
  });
});
