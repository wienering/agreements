import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    agreement: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  sendEmail: vi.fn(),
  sendTelegramMessage: vi.fn(),
  logAgreementActivity: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/email/send', () => ({ sendEmail: mocks.sendEmail }));
vi.mock('@/lib/telegram', () => ({ sendTelegramMessage: mocks.sendTelegramMessage }));
vi.mock('@/lib/activityLog', () => ({ logAgreementActivity: mocks.logAgreementActivity }));

import { GOOGLE_REVIEW_URL_ONTARIO } from '@/lib/followups/rules';
import { alertHeldGallery, sendGalleryEmail, sendReviewRequest } from '@/lib/followups/send';

const NOW = new Date('2026-10-20T14:30:00.000Z');
const ID = 'agr_1';

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    status: 'SIGNED',
    archived: false,
    cancelledAt: null,
    paymentStatus: 'Fully paid',
    galleryLink: 'https://gallery.example.com/abc',
    galleryLinks: null,
    galleryEmailSentAt: null,
    reviewRequestSentAt: null,
    client: { firstName: 'Jane', lastName: 'Smith', emailGreetingName: null, email: 'jane@example.com' },
    event: { eventDate: new Date('2026-10-17T12:00:00.000Z'), eventType: 'wedding' },
    ...overrides,
  };
}

const auto = { trigger: 'auto' as const, dryRun: false, now: NOW };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.agreement.findUnique.mockResolvedValue(record());
  mocks.prisma.agreement.updateMany.mockResolvedValue({ count: 1 });
  mocks.sendEmail.mockResolvedValue({});
});

describe('sendGalleryEmail', () => {
  it('claims galleryEmailSentAt before sending, then logs the send', async () => {
    const result = await sendGalleryEmail(ID, auto);

    expect(result).toMatchObject({ status: 'sent', to: 'jane@example.com' });
    expect(mocks.prisma.agreement.updateMany).toHaveBeenCalledWith({
      where: { id: ID, galleryEmailSentAt: null },
      data: { galleryEmailSentAt: NOW },
    });
    const claimOrder = mocks.prisma.agreement.updateMany.mock.invocationCallOrder[0];
    const sendOrder = mocks.sendEmail.mock.invocationCallOrder[0];
    expect(claimOrder).toBeLessThan(sendOrder);
    expect(mocks.logAgreementActivity).toHaveBeenCalledWith(ID, 'GALLERY_EMAIL_SENT', expect.objectContaining({ trigger: 'auto' }));
  });

  it('does not send when another run already claimed it', async () => {
    mocks.prisma.agreement.updateMany.mockResolvedValue({ count: 0 });

    const result = await sendGalleryEmail(ID, auto);

    expect(result.status).toBe('refused');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('refuses without claiming when it was already sent', async () => {
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ galleryEmailSentAt: new Date('2026-10-18') }));

    const result = await sendGalleryEmail(ID, { ...auto, trigger: 'manual' });

    expect(result).toMatchObject({ status: 'refused', reason: expect.stringMatching(/Resend/) });
    expect(mocks.prisma.agreement.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('rolls the claim back and alerts when the email fails', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('SMTP timeout'));

    const result = await sendGalleryEmail(ID, auto);

    expect(result).toMatchObject({ status: 'failed', reason: 'SMTP timeout' });
    expect(mocks.prisma.agreement.updateMany).toHaveBeenLastCalledWith({
      where: { id: ID, galleryEmailSentAt: NOW },
      data: { galleryEmailSentAt: null },
    });
    expect(mocks.sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(mocks.sendTelegramMessage.mock.calls[0][0]).toContain('/admin/agreements?agreement=agr_1');
    expect(mocks.logAgreementActivity).toHaveBeenCalledWith(ID, 'FOLLOWUP_EMAIL_FAILED', expect.objectContaining({ email: 'gallery' }));
    expect(mocks.logAgreementActivity).not.toHaveBeenCalledWith(ID, 'GALLERY_EMAIL_SENT', expect.anything());
  });

  it('sends a held gallery manually: Send now ignores the balance', async () => {
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ paymentStatus: 'Balance due' }));

    const result = await sendGalleryEmail(ID, { ...auto, trigger: 'manual' });

    expect(result.status).toBe('sent');
    expect(mocks.prisma.agreement.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { galleryEmailSentAt: NOW } }),
    );
  });

  it('resends without touching the sent timestamp', async () => {
    const firstSent = new Date('2026-10-18T14:00:00.000Z');
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ galleryEmailSentAt: firstSent }));

    const result = await sendGalleryEmail(ID, { ...auto, trigger: 'manual', resend: true });

    expect(result.status).toBe('sent');
    expect(mocks.prisma.agreement.updateMany).not.toHaveBeenCalled();
    expect(mocks.logAgreementActivity).toHaveBeenCalledWith(ID, 'GALLERY_EMAIL_SENT', expect.objectContaining({ resend: true }));
  });

  it('lets you Send now and Resend by hand on a draft', async () => {
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ status: 'DRAFT' }));
    expect((await sendGalleryEmail(ID, { ...auto, trigger: 'manual' })).status).toBe('sent');

    mocks.prisma.agreement.findUnique.mockResolvedValue(
      record({ status: 'DRAFT', galleryEmailSentAt: new Date('2026-10-18T14:00:00.000Z') }),
    );
    expect((await sendGalleryEmail(ID, { ...auto, trigger: 'manual', resend: true })).status).toBe('sent');
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('refuses a resend before the first send', async () => {
    const result = await sendGalleryEmail(ID, { ...auto, trigger: 'manual', resend: true });
    expect(result.status).toBe('refused');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('only reads in a dry run: no claim, no email, no alert, no log', async () => {
    const result = await sendGalleryEmail(ID, { ...auto, dryRun: true });

    expect(result).toMatchObject({ status: 'dry_run', to: 'jane@example.com' });
    expect(mocks.prisma.agreement.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
    expect(mocks.logAgreementActivity).not.toHaveBeenCalled();
  });

  it('refuses when no gallery link is saved', async () => {
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ galleryLink: null }));
    expect((await sendGalleryEmail(ID, auto)).status).toBe('refused');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('sendReviewRequest', () => {
  const review = { ...auto, reviewUrl: GOOGLE_REVIEW_URL_ONTARIO };

  it('claims reviewRequestSentAt before sending the agreed email', async () => {
    const result = await sendReviewRequest(ID, review);

    expect(result).toMatchObject({ status: 'sent', subject: 'A quick favour' });
    expect(mocks.prisma.agreement.updateMany).toHaveBeenCalledWith({
      where: { id: ID, reviewRequestSentAt: null },
      data: { reviewRequestSentAt: NOW },
    });
    expect(mocks.sendEmail.mock.calls[0][0].html).toContain(GOOGLE_REVIEW_URL_ONTARIO);
  });

  it('never sends a second review request, manual or automatic', async () => {
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ reviewRequestSentAt: new Date('2026-10-19') }));
    expect((await sendReviewRequest(ID, review)).status).toBe('refused');
    expect((await sendReviewRequest(ID, { ...review, trigger: 'manual' })).status).toBe('refused');
    expect(mocks.sendEmail).not.toHaveBeenCalled();

    mocks.prisma.agreement.findUnique.mockResolvedValue(record());
    mocks.prisma.agreement.updateMany.mockResolvedValue({ count: 0 });
    expect((await sendReviewRequest(ID, review)).status).toBe('refused');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('works manually on a draft agreement and uses the chosen market link', async () => {
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ status: 'DRAFT' }));
    const calgary = 'https://g.page/r/CVmM2MGaxRWdEAE/review';

    const result = await sendReviewRequest(ID, { ...review, trigger: 'manual', reviewUrl: calgary, market: 'calgary' });

    expect(result.status).toBe('sent');
    expect(mocks.sendEmail.mock.calls[0][0].html).toContain(calgary);
    expect(mocks.logAgreementActivity).toHaveBeenCalledWith(ID, 'REVIEW_REQUEST_SENT', expect.objectContaining({ market: 'calgary' }));
  });

  it('refuses cancelled agreements', async () => {
    mocks.prisma.agreement.findUnique.mockResolvedValue(record({ status: 'CANCELLED' }));
    expect((await sendReviewRequest(ID, review)).status).toBe('refused');
  });

  it('rolls back and alerts when the email fails', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('SMTP down'));

    const result = await sendReviewRequest(ID, review);

    expect(result.status).toBe('failed');
    expect(mocks.prisma.agreement.updateMany).toHaveBeenLastCalledWith({
      where: { id: ID, reviewRequestSentAt: NOW },
      data: { reviewRequestSentAt: null },
    });
    expect(mocks.sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it('only reads in a dry run', async () => {
    expect((await sendReviewRequest(ID, { ...review, dryRun: true })).status).toBe('dry_run');
    expect(mocks.prisma.agreement.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe('alertHeldGallery', () => {
  const held = { id: ID, client: { firstName: 'Jane', lastName: 'Smith' }, paymentStatus: 'Deposit paid' };

  it('alerts once, with a link to the agreement, and logs the hold', async () => {
    expect(await alertHeldGallery(held, { dryRun: false, now: NOW })).toBe('alerted');
    expect(mocks.prisma.agreement.updateMany).toHaveBeenCalledWith({
      where: { id: ID, galleryHeldAlertAt: null },
      data: { galleryHeldAlertAt: NOW },
    });
    expect(mocks.sendTelegramMessage.mock.calls[0][0]).toContain('/admin/agreements?agreement=agr_1');
    expect(mocks.logAgreementActivity).toHaveBeenCalledWith(ID, 'GALLERY_EMAIL_HELD', { paymentStatus: 'Deposit paid' });
  });

  it('does not alert again once alerted', async () => {
    mocks.prisma.agreement.updateMany.mockResolvedValue({ count: 0 });
    expect(await alertHeldGallery(held, { dryRun: false, now: NOW })).toBe('already_alerted');
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('does nothing in a dry run', async () => {
    expect(await alertHeldGallery(held, { dryRun: true })).toBe('dry_run');
    expect(mocks.prisma.agreement.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
  });
});
