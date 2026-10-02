import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: { agreement: { findFirst: vi.fn() } },
  sendEmail: vi.fn(),
  generateAgreementPdf: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/email/send', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('@/lib/pdf/agreement', () => ({ generateAgreementPdf: mocks.generateAgreementPdf }));
vi.mock('@/app/api/agreements/portal/shared/agreement-utils', () => ({
  processHtmlContent: () => '<p>Agreement body</p>',
}));

import { POST as emailCopy } from '@/app/api/agreements/email/route';
import { POST as emailFallback } from '@/app/api/agreements/email-fallback/route';
import { POST as pdf } from '@/app/api/agreements/pdf/route';

function completedAgreement() {
  return {
    id: 'agr_1',
    status: 'COMPLETED',
    uniqueToken: 'tok_1',
    expiresAt: new Date('2025-01-01T00:00:00.000Z'),
    signedAt: new Date('2024-12-20T15:00:00.000Z'),
    customHtmlContent: null,
    secondSignerEnabled: false,
    secondSignerEmail: null,
    client: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', emailGreetingName: null },
    template: { htmlContent: '<p>Template</p>' },
    event: null,
    signatures: [],
  };
}

function post(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', host: 'localhost' },
  });
}

const whereOf = () => mocks.prisma.agreement.findFirst.mock.calls[0][0].where;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.agreement.findFirst.mockResolvedValue(completedAgreement());
  mocks.sendEmail.mockResolvedValue({});
  mocks.generateAgreementPdf.mockResolvedValue(Buffer.from('%PDF-1.4'));
  vi.stubEnv('SMTP_HOST', 'smtp.example.com');
  vi.stubEnv('SMTP_USER', 'user');
  vi.stubEnv('SMTP_PASS', 'pass');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('email a copy', () => {
  it('looks for SIGNED or COMPLETED agreements', async () => {
    await emailCopy(post('/api/agreements/email', { token: 'tok_1', recipientEmail: 'jane@example.com' }));
    expect(whereOf()).toEqual({ uniqueToken: 'tok_1', status: { in: ['SIGNED', 'COMPLETED'] } });
  });

  it('emails a copy of a completed agreement when the client asks', async () => {
    const response = await emailCopy(post('/api/agreements/email', { token: 'tok_1', recipientEmail: 'jane@example.com' }));
    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe('jane@example.com');
  });

  it('still refuses when no signed agreement matches', async () => {
    mocks.prisma.agreement.findFirst.mockResolvedValue(null);
    const response = await emailCopy(post('/api/agreements/email', { token: 'tok_1', recipientEmail: 'jane@example.com' }));
    expect(response.status).toBe(404);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('email fallback (shareable link)', () => {
  it('looks for SIGNED or COMPLETED agreements and works for a completed one without sending email', async () => {
    const response = await emailFallback(
      post('/api/agreements/email-fallback', { token: 'tok_1', recipientEmail: 'jane@example.com' }),
    );
    expect(whereOf()).toEqual({ uniqueToken: 'tok_1', status: { in: ['SIGNED', 'COMPLETED'] } });
    expect(response.status).toBe(200);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('PDF download', () => {
  it('lets SIGNED and COMPLETED agreements skip the expiry date', async () => {
    await pdf(post('/api/agreements/pdf', { token: 'tok_1' }));
    const where = whereOf();
    expect(where.uniqueToken).toBe('tok_1');
    expect(where.OR[0]).toEqual({ status: { in: ['SIGNED', 'COMPLETED'] } });
    expect(where.OR.slice(1)).toEqual([{ expiresAt: null }, { expiresAt: { gte: expect.any(Date) } }]);
  });

  it('returns the PDF for a completed agreement past its expiry date', async () => {
    const response = await pdf(post('/api/agreements/pdf', { token: 'tok_1' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });
});
