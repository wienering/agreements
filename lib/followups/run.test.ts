import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  sendGalleryEmail: vi.fn(),
  sendReviewRequest: vi.fn(),
  alertHeldGallery: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { event: { findMany: mocks.findMany } } }));
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
    status: 'UPCOMING',
    archived: false,
    cancelledAt: null,
    paymentStatus: 'Fully paid',
    galleryLinks: [{ title: 'Photo Gallery', url: 'https://gallery.example.com/x' }],
    galleryEmailSentAt: null,
    reviewRequestSentAt: null,
    followUpsPaused: false,
    reviewReceived: false,
    galleryHeldAlertAt: null,
    client: { firstName: 'Jane', lastName: id },
    eventDate: new Date('2026-10-17T12:00:00.000Z'),
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
  it('sends nothing and alerts nothing for cancelled events', async () => {
    mocks.findMany.mockResolvedValue([
      record('cancelled_due', { status: 'CANCELLED' }),
      record('cancelled_owing', { status: 'CANCELLED', paymentStatus: 'Deposit paid' }),
    ]);

    const summary = await runFollowups({ now: NOW, dryRun: false, launchKey: LAUNCH });

    expect(mocks.sendGalleryEmail).not.toHaveBeenCalled();
    expect(mocks.alertHeldGallery).not.toHaveBeenCalled();
    expect(summary.galleryEmails).toEqual([]);
    expect(summary.held).toEqual([]);
  });

  it('handles every upcoming or completed event, agreement or not', async () => {
    mocks.findMany.mockResolvedValue([
      record('upcoming_due'),
      record('completed_due', { status: 'COMPLETED' }),
      record('owing', { paymentStatus: 'Deposit paid' }),
      record('stripe_paid', { paymentStatus: 'Fully Paid' }),
    ]);

    await runFollowups({ now: NOW, dryRun: false, launchKey: LAUNCH });

    expect(mocks.sendGalleryEmail.mock.calls.map((call) => call[0]).sort()).toEqual([
      'completed_due',
      'stripe_paid',
      'upcoming_due',
    ]);
    expect(mocks.alertHeldGallery).toHaveBeenCalledTimes(1);
    expect(mocks.alertHeldGallery.mock.calls[0][0].id).toBe('owing');
  });
});
