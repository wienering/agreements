import { beforeEach, describe, expect, it, vi } from 'vitest';

const splitTextToSize = vi.hoisted(() => vi.fn((text: string) => String(text).split('\n')));

const jsPdfMock = vi.hoisted(() =>
  vi.fn(function JsPdfMock(this: Record<string, unknown>) {
    this.setFontSize = vi.fn();
    this.setFont = vi.fn();
    this.splitTextToSize = splitTextToSize;
    this.addPage = vi.fn();
    this.text = vi.fn();
    this.output = vi.fn(() => new ArrayBuffer(8));
    return this;
  }),
);

vi.mock('jspdf', () => ({
  default: jsPdfMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { generateAgreementPdf } from '@/lib/pdf/agreement';

const agreement = {
  id: 'agr_1',
  status: 'DRAFT',
  mergedHtml: null,
  customHtmlContent: '<p>Hello <strong>there</strong></p>',
  signedAt: null,
  signedFromIP: null,
  client: {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    eventDate: new Date('2026-06-01T16:00:00.000Z'),
  },
  template: { htmlContent: '<p>template</p>' },
  event: null,
  signatures: [],
  secondSignerEnabled: false,
};

describe('generateAgreementPdf', () => {
  beforeEach(() => {
    splitTextToSize.mockClear();
    jsPdfMock.mockClear();
  });

  it('builds a US Letter document and wraps text at 215.9mm minus the side margins', async () => {
    const buffer = await generateAgreementPdf(agreement, 'document');

    expect(jsPdfMock).toHaveBeenCalledWith('p', 'mm', 'letter');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    const widths = splitTextToSize.mock.calls.map((call) => call[1]);
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every((width) => width === 215.9 - 60)).toBe(true);
  });

  it('uses the letter width for the portal layout instead of A4 210mm', async () => {
    await generateAgreementPdf(
      {
        ...agreement,
        status: 'SIGNED',
        mergedHtml: '<p>Signed snapshot</p>',
        signedAt: new Date('2026-05-01T16:00:00.000Z'),
      },
      'portal',
    );

    const widths = splitTextToSize.mock.calls.map((call) => call[1]);
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every((width) => width === 215.9 - 50)).toBe(true);
    expect(widths).not.toContain(210 - 50);
  });
});
