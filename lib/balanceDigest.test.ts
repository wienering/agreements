import { describe, expect, it } from 'vitest';
import {
  balanceDigestSnoozeUntil,
  formatDaysUntilEvent,
  hasBalanceOwing,
  isIncludedInBalanceDigest,
  isListedInBalanceDigest,
  type BalanceDigestCandidate,
} from '@/lib/balanceDigest';
import { torontoDateKey } from '@/lib/dates';

const NOW = new Date('2026-10-02T16:00:00.000Z');

function candidate(overrides: Partial<BalanceDigestCandidate> = {}): BalanceDigestCandidate {
  return {
    status: 'SIGNED',
    archived: false,
    cancelledAt: null,
    paymentStatus: 'Deposit paid',
    balanceDigestSnoozedUntil: null,
    event: { eventDate: new Date('2026-10-06T16:00:00.000Z') },
    client: { eventDate: null },
    ...overrides,
  };
}

describe('isIncludedInBalanceDigest', () => {
  it('includes a signed unpaid event inside the 10-day Toronto window', () => {
    expect(isIncludedInBalanceDigest(candidate(), NOW)).toBe(true);
    expect(
      isIncludedInBalanceDigest(
        candidate({ event: { eventDate: new Date('2026-10-02T04:00:00.000Z') } }),
        NOW,
      ),
    ).toBe(true);
    expect(
      isIncludedInBalanceDigest(
        candidate({ event: { eventDate: new Date('2026-10-13T03:30:00.000Z') } }),
        NOW,
      ),
    ).toBe(true);
  });

  it('excludes events before today or more than 10 Toronto days out', () => {
    expect(
      isIncludedInBalanceDigest(
        candidate({ event: { eventDate: new Date('2026-10-02T03:30:00.000Z') } }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isIncludedInBalanceDigest(
        candidate({ event: { eventDate: new Date('2026-10-13T04:00:00.000Z') } }),
        NOW,
      ),
    ).toBe(false);
  });

  it('excludes anything that is not signed, is archived, is cancelled, or is fully paid', () => {
    expect(isIncludedInBalanceDigest(candidate({ status: 'SENT' }), NOW)).toBe(false);
    expect(isIncludedInBalanceDigest(candidate({ status: 'CANCELLED' }), NOW)).toBe(false);
    expect(isIncludedInBalanceDigest(candidate({ archived: true }), NOW)).toBe(false);
    expect(
      isIncludedInBalanceDigest(candidate({ cancelledAt: new Date('2026-09-01T16:00:00.000Z') }), NOW),
    ).toBe(false);
    expect(isIncludedInBalanceDigest(candidate({ paymentStatus: 'Fully paid' }), NOW)).toBe(false);
  });

  it('treats every spelling of fully paid as paid, including Stripe\'s', () => {
    for (const paymentStatus of ['fully paid', 'Fully Paid', ' FULLY  PAID ', 'Paid', 'Balance Paid']) {
      expect(isIncludedInBalanceDigest(candidate({ paymentStatus }), NOW)).toBe(false);
    }
  });

  it('keeps other payment statuses, including an empty one', () => {
    expect(isIncludedInBalanceDigest(candidate({ paymentStatus: null }), NOW)).toBe(true);
    expect(isIncludedInBalanceDigest(candidate({ paymentStatus: 'Balance due' }), NOW)).toBe(true);
    expect(isIncludedInBalanceDigest(candidate({ paymentStatus: 'Deposit Paid' }), NOW)).toBe(true);
  });

  it('excludes a snooze dated after today and includes one dated today or earlier', () => {
    expect(
      isIncludedInBalanceDigest(
        candidate({ balanceDigestSnoozedUntil: new Date('2026-10-03T04:00:00.000Z') }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isIncludedInBalanceDigest(
        candidate({ balanceDigestSnoozedUntil: new Date('2026-10-02T04:00:00.000Z') }),
        NOW,
      ),
    ).toBe(true);
    expect(
      isIncludedInBalanceDigest(
        candidate({ balanceDigestSnoozedUntil: new Date('2026-10-01T16:00:00.000Z') }),
        NOW,
      ),
    ).toBe(true);
  });

  it('uses the event date when both the event and the client have one', () => {
    expect(
      isIncludedInBalanceDigest(
        candidate({
          event: { eventDate: new Date('2026-10-20T16:00:00.000Z') },
          client: { eventDate: new Date('2026-10-03T16:00:00.000Z') },
        }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isIncludedInBalanceDigest(
        candidate({
          event: { eventDate: null },
          client: { eventDate: new Date('2026-10-03T16:00:00.000Z') },
        }),
        NOW,
      ),
    ).toBe(true);
  });

  it('excludes an agreement with no event date', () => {
    expect(
      isIncludedInBalanceDigest(candidate({ event: { eventDate: null }, client: { eventDate: null } }), NOW),
    ).toBe(false);
  });

  it('snoozes until three Toronto days from now', () => {
    expect(torontoDateKey(balanceDigestSnoozeUntil(NOW))).toBe('2026-10-05');
  });

  it('includes a completed agreement that is not fully paid, however long ago the event was', () => {
    const past = { event: { eventDate: new Date('2025-11-15T16:00:00.000Z') } };
    expect(isIncludedInBalanceDigest(candidate({ status: 'COMPLETED', paymentStatus: 'Not paid', ...past }), NOW)).toBe(true);
    expect(isIncludedInBalanceDigest(candidate({ status: 'COMPLETED', paymentStatus: null, ...past }), NOW)).toBe(true);
    expect(isIncludedInBalanceDigest(candidate({ status: 'COMPLETED' }), NOW)).toBe(true);
  });

  it('applies the same exclusions to completed agreements', () => {
    const completed = { status: 'COMPLETED', event: { eventDate: new Date('2026-09-10T16:00:00.000Z') } };
    expect(isIncludedInBalanceDigest(candidate({ ...completed, paymentStatus: 'Fully Paid' }), NOW)).toBe(false);
    expect(isIncludedInBalanceDigest(candidate({ ...completed, archived: true }), NOW)).toBe(false);
    expect(
      isIncludedInBalanceDigest(candidate({ ...completed, balanceDigestSnoozedUntil: new Date('2026-10-04T16:00:00.000Z') }), NOW),
    ).toBe(false);
    expect(
      isIncludedInBalanceDigest(candidate({ ...completed, event: { eventDate: new Date('2026-10-20T16:00:00.000Z') } }), NOW),
    ).toBe(false);
  });

  it('labels past events as days ago', () => {
    expect(formatDaysUntilEvent(new Date('2026-10-01T16:00:00.000Z'), NOW)).toBe('1 day ago');
    expect(formatDaysUntilEvent(new Date('2026-09-22T16:00:00.000Z'), NOW)).toBe('10 days ago');
    expect(formatDaysUntilEvent(new Date('2026-10-02T20:00:00.000Z'), NOW)).toBe('Today');
    expect(formatDaysUntilEvent(new Date('2026-10-05T16:00:00.000Z'), NOW)).toBe('3 days');
  });
});

describe('isListedInBalanceDigest', () => {
  // Nov 6 2026, the day after the events go-live.
  const AFTER_LAUNCH = new Date('2026-11-06T15:00:00.000Z');
  const listed = (overrides: Partial<BalanceDigestCandidate> = {}, packagePrice: number | string | null = 595) =>
    isListedInBalanceDigest(
      { ...candidate({ event: { eventDate: new Date('2026-11-10T22:00:00.000Z') }, ...overrides }), packagePrice },
      AFTER_LAUNCH,
    );

  it('keeps a signed upcoming event in the next 10 days with a balance', () => {
    expect(listed()).toBe(true);
  });

  it('excludes a missing or $0 balance', () => {
    expect(listed({}, null)).toBe(false);
    expect(listed({}, 0)).toBe(false);
    expect(listed({}, '0.00')).toBe(false);
    expect(listed({}, '150.00')).toBe(true);
  });

  it('excludes completed events dated before the Nov 4 2026 go-live, by Toronto day', () => {
    const completed = (eventDate: Date) => listed({ status: 'COMPLETED', paymentStatus: 'Not paid', event: { eventDate } });
    expect(completed(new Date('2025-11-15T22:00:00.000Z'))).toBe(false);
    // 11:30pm Nov 3 in Toronto is still before go-live, though it's Nov 4 in UTC.
    expect(completed(new Date('2026-11-04T04:30:00.000Z'))).toBe(false);
    expect(completed(new Date('2026-11-04T05:00:00.000Z'))).toBe(true);
    expect(completed(new Date('2026-11-05T22:00:00.000Z'))).toBe(true);
  });

  it('still applies the existing rules', () => {
    expect(listed({ paymentStatus: 'Fully paid' })).toBe(false);
    expect(listed({ event: { eventDate: new Date('2026-11-20T22:00:00.000Z') } })).toBe(false);
  });
});

describe('hasBalanceOwing', () => {
  it('reads Prisma decimals by their string value', () => {
    expect(hasBalanceOwing({ toString: () => '0' })).toBe(false);
    expect(hasBalanceOwing({ toString: () => '425.50' })).toBe(true);
    expect(hasBalanceOwing(undefined)).toBe(false);
    expect(hasBalanceOwing(-10)).toBe(false);
  });
});
