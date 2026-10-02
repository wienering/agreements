import { describe, expect, it } from 'vitest';
import { renderBalanceDigestEmail } from '@/lib/balanceDigestEmail';
import { buildFollowupDigestSections } from '@/lib/followups/digest';
import type { FollowupAgreement } from '@/lib/followups/rules';

const LAUNCH = '2026-10-02';
// 9:45am Toronto: the digest runs before the 10am follow-up run.
const NOW = new Date('2026-10-20T13:45:00.000Z');
const BASE = 'https://agreements.example.com';

function agreement(id: string, firstName: string, overrides: Partial<FollowupAgreement> = {}) {
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
    event: { eventDate: new Date('2026-10-17T12:00:00.000Z') },
    ...overrides,
    client: { firstName, lastName: 'Smith', eventDate: null },
  };
}

describe('buildFollowupDigestSections', () => {
  const sections = buildFollowupDigestSections(
    [
      agreement('a_gallery', 'Gail'),
      agreement('a_review', 'Rita', { galleryEmailSentAt: new Date('2026-10-17T20:00:00.000Z') }),
      agreement('a_held', 'Hank', { paymentStatus: 'Deposit paid', galleryHeldAlertAt: new Date('2026-10-18T14:00:00.000Z') }),
      agreement('a_paused', 'Paul', { followUpsPaused: true }),
      agreement('a_old', 'Olga', { event: { eventDate: new Date('2026-09-20T12:00:00.000Z') } }),
    ],
    NOW,
    LAUNCH,
    BASE,
  );

  it('lists what the 10am run will send today', () => {
    expect(sections.goingOut.map((i) => i.clientName)).toEqual(['Gail Smith', 'Rita Smith']);
    expect(sections.goingOut[0].label).toMatch(/^Gallery email/);
    expect(sections.goingOut[1].label).toBe('Review request');
    expect(sections.goingOut[0].adminUrl).toBe(`${BASE}/admin/agreements?agreement=a_gallery`);
  });

  it('keeps listing held galleries every day, even after the alert went out', () => {
    expect(sections.held).toHaveLength(1);
    expect(sections.held[0]).toMatchObject({ clientName: 'Hank Smith', adminUrl: `${BASE}/admin/agreements?agreement=a_held` });
    expect(sections.held[0].label).toContain('Payment: Deposit paid');
  });

  it('leaves out paused and pre-launch agreements', () => {
    const names = [...sections.goingOut, ...sections.held].map((i) => i.clientName);
    expect(names).not.toContain('Paul Smith');
    expect(names).not.toContain('Olga Smith');
  });
});

describe('renderBalanceDigestEmail with follow-ups', () => {
  const followups = {
    goingOut: [{ clientName: 'Gail Smith', label: 'Gallery email', adminUrl: `${BASE}/a` }],
    held: [{ clientName: 'Hank Smith', label: 'Payment: Deposit paid', adminUrl: `${BASE}/b` }],
  };

  it('adds both sections', () => {
    const email = renderBalanceDigestEmail([], followups);
    expect(email.subject).toBe('Follow-ups: 1 going out today, 1 held');
    expect(email.html).toContain('Follow-ups going out today');
    expect(email.html).toContain('Galleries held (balance owing)');
    expect(email.text).toContain('Gail Smith: Gallery email');
    expect(email.text).toContain('Hank Smith: Payment: Deposit paid');
  });

  it('keeps the balance subject when there are balance rows too', () => {
    const block = {
      clientName: 'Bea',
      eventDateLabel: 'Sat',
      daysUntilLabel: '3 days',
      packageLine: null,
      paymentStatus: 'Deposit paid',
      reminderSentLabel: null,
      markPaidUrl: 'm',
      remindUrl: 'r',
      snoozeUrl: 's',
      adminUrl: 'a',
    };
    const email = renderBalanceDigestEmail([block], followups);
    expect(email.subject).toBe('Balance due: 1 event in the next 10 days');
    expect(email.html).toContain('Follow-ups going out today');
  });

  it('is unchanged without follow-ups', () => {
    const email = renderBalanceDigestEmail([]);
    expect(email.html).not.toContain('Follow-ups going out today');
    expect(email.html).not.toContain('Galleries held');
  });
});
