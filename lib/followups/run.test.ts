import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  sendGalleryEmail: vi.fn(),
  sendReviewRequest: vi.fn(),
  alertHeldGallery: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { agreement: { findMany: mocks.findMany } } }));
vi.mock('@/lib/followups/send', () => ({
  sendGalleryEmail: mocks.sendGalleryEmail,
  sendReviewRequest: mocks.sendReviewRequest,
  alertHeldGallery: mocks.alertHeldGallery,
}));

import { runFollowups } from '@/lib/followups/run';

const NOW = new Date('2026-10-20T14:30:00.000Z');
const LAUNCH = '2026-10-02';

function record(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    status: 'SIGNED',
    archived: false,
    cancelledAt: null,
    paymentStatus: 'Fully paid',
    galleryLink: 'https://gallery.example.com/x',
    galleryLinks: null,
    galleryEmailSentAt: null,
    reviewRequestSentAt: null,
    followUpsPaused: false,
    reviewReceived: false,
    galleryHeldAlertAt: null,
    client: { firstName: 'Jane', lastName: id, eventDate: null },
    event: { eventDate: new Date('2026-10-17T12:00:00.000Z') },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendGalleryEmail.mockResolvedValue({ status: 'sent', to: 'x@example.com' });
  mocks.sendReviewRequest.mockResolvedValue({ status: 'sent', to: 'x@example.com' });
  mocks.alertHeldGallery.mockResolvedValue('alerted');
});

describe('runFollowups (the 10am cron)', () => {
  it('sends nothing and alerts nothing for drafts', async () => {
    mocks.findMany.mockResolvedValue([
      record('draft_due', { status: 'DRAFT' }),
      record('draft_owing', { status: 'DRAFT', paymentStatus: 'Deposit paid' }),
      record('draft_review', { status: 'DRAFT', galleryEmailSentAt: new Date('2026-10-17T20:00:00.000Z') }),
    ]);

    const summary = await runFollowups({ now: NOW, dryRun: false, launchKey: LAUNCH });

    expect(mocks.sendGalleryEmail).not.toHaveBeenCalled();
    expect(mocks.sendReviewRequest).not.toHaveBeenCalled();
    expect(mocks.alertHeldGallery).not.toHaveBeenCalled();
    expect(summary.galleryEmails).toEqual([]);
    expect(summary.reviewRequests).toEqual([]);
    expect(summary.held).toEqual([]);
  });

  it('still handles signed agreements in the same run', async () => {
    mocks.findMany.mockResolvedValue([
      record('draft_due', { status: 'DRAFT' }),
      record('signed_due'),
      record('signed_owing', { paymentStatus: 'Deposit paid' }),
      record('stripe_paid', { paymentStatus: 'Fully Paid' }),
    ]);

    await runFollowups({ now: NOW, dryRun: false, launchKey: LAUNCH });

    expect(mocks.sendGalleryEmail.mock.calls.map((call) => call[0]).sort()).toEqual(['signed_due', 'stripe_paid']);
    expect(mocks.alertHeldGallery).toHaveBeenCalledTimes(1);
    expect(mocks.alertHeldGallery.mock.calls[0][0].id).toBe('signed_owing');
  });
});
