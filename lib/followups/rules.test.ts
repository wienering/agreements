import { describe, expect, it } from 'vitest';
import {
  FOLLOWUPS_DEFAULT_LAUNCH_DATE,
  followupsDryRun,
  followupsLaunchDateKey,
  galleryEmailStatus,
  isFollowupRunHour,
  isGalleryEmailDue,
  isGalleryEmailHeld,
  isReviewRequestDue,
  manualReviewRefusal,
  planFollowups,
  reviewRequestDueDateKey,
  reviewRequestStatus,
  type FollowupAgreement,
} from '@/lib/followups/rules';

const LAUNCH = '2026-10-02';
// 10:30am Toronto (EDT) on Tue Oct 20, 2026.
const NOW = new Date('2026-10-20T14:30:00.000Z');
// Event dates are stored at noon UTC on the event day.
const eventOn = (day: string) => new Date(`${day}T12:00:00.000Z`);

function agreement(overrides: Partial<FollowupAgreement> = {}): FollowupAgreement {
  return {
    id: 'agr_1',
    status: 'SIGNED',
    archived: false,
    cancelledAt: null,
    paymentStatus: 'Fully paid',
    galleryLink: 'https://gallery.example.com/abc',
    galleryLinks: null,
    galleryEmailSentAt: null,
    reviewRequestSentAt: null,
    followUpsPaused: false,
    reviewReceived: false,
    galleryHeldAlertAt: null,
    event: { eventDate: eventOn('2026-10-17') },
    client: { eventDate: null },
    ...overrides,
  };
}

const galleryDue = (a: FollowupAgreement, now = NOW) => isGalleryEmailDue(a, now, LAUNCH);
const reviewDue = (a: FollowupAgreement, now = NOW) => isReviewRequestDue(a, now, LAUNCH);

describe('gallery email eligibility', () => {
  it('is due when the event has passed, a gallery link is saved, nothing is owing and nothing blocks it', () => {
    expect(galleryDue(agreement())).toBe(true);
  });

  it('waits until the day after the event', () => {
    expect(galleryDue(agreement({ event: { eventDate: eventOn('2026-10-20') } }))).toBe(false);
    expect(galleryEmailStatus(agreement({ event: { eventDate: eventOn('2026-10-20') } }), NOW, LAUNCH)).toEqual({
      kind: 'scheduled',
      dateKey: '2026-10-21',
    });
    expect(galleryDue(agreement({ event: { eventDate: eventOn('2026-10-19') } }))).toBe(true);
  });

  it('needs a saved gallery link', () => {
    expect(galleryDue(agreement({ galleryLink: null }))).toBe(false);
    expect(galleryDue(agreement({ galleryLink: '  ' }))).toBe(false);
    expect(galleryDue(agreement({ galleryLink: null, galleryLinks: [{ title: 'x', url: '' }] }))).toBe(false);
    expect(galleryDue(agreement({ galleryLink: null, galleryLinks: [{ title: '360', url: 'https://g/360' }] }))).toBe(true);
    expect(galleryEmailStatus(agreement({ galleryLink: null }), NOW, LAUNCH)).toEqual({
      kind: 'waiting',
      reason: 'Waiting for a gallery link',
    });
  });

  it('is never sent twice', () => {
    const sent = agreement({ galleryEmailSentAt: new Date('2026-10-19T14:00:00.000Z') });
    expect(galleryDue(sent)).toBe(false);
    expect(galleryEmailStatus(sent, NOW, LAUNCH).kind).toBe('sent');
  });

  it('skips cancelled, void and archived agreements but counts drafts', () => {
    expect(galleryDue(agreement({ status: 'CANCELLED' }))).toBe(false);
    expect(galleryDue(agreement({ status: 'VOID' }))).toBe(false);
    expect(galleryDue(agreement({ archived: true }))).toBe(false);
    expect(galleryDue(agreement({ cancelledAt: new Date() }))).toBe(false);
    expect(galleryDue(agreement({ status: 'DRAFT' }))).toBe(true);
    expect(galleryDue(agreement({ status: 'COMPLETED' }))).toBe(true);
  });

  it('is paused while follow-ups are paused, and goes out on the next run after unpausing', () => {
    const paused = agreement({ followUpsPaused: true, event: { eventDate: eventOn('2026-10-10') } });
    expect(galleryDue(paused)).toBe(false);
    expect(galleryEmailStatus(paused, NOW, LAUNCH)).toEqual({ kind: 'paused' });
    expect(galleryDue({ ...paused, followUpsPaused: false })).toBe(true);
  });
});

describe('launch cutoff', () => {
  it('never emails agreements whose event is before the go-live date', () => {
    const before = agreement({ event: { eventDate: eventOn('2026-10-01') } });
    expect(galleryDue(before)).toBe(false);
    expect(galleryEmailStatus(before, NOW, LAUNCH).kind).toBe('skipped');
    expect(isGalleryEmailHeld({ ...before, paymentStatus: null }, NOW, LAUNCH)).toBe(false);
  });

  it('includes events on the go-live date itself', () => {
    expect(galleryDue(agreement({ event: { eventDate: eventOn('2026-10-02') } }))).toBe(true);
  });

  it('uses the legacy client event date when there is no event record', () => {
    expect(galleryDue(agreement({ event: null, client: { eventDate: eventOn('2026-10-17') } }))).toBe(true);
    expect(galleryDue(agreement({ event: null, client: { eventDate: eventOn('2026-09-30') } }))).toBe(false);
    expect(galleryDue(agreement({ event: null, client: { eventDate: null } }))).toBe(false);
  });

  it('skips the review request for pre-launch events even if the gallery went out by hand', () => {
    const manualOld = agreement({
      event: { eventDate: eventOn('2026-09-20') },
      galleryEmailSentAt: new Date('2026-10-10T15:00:00.000Z'),
    });
    expect(reviewDue(manualOld)).toBe(false);
    expect(reviewRequestStatus(manualOld, NOW, LAUNCH).kind).toBe('skipped');
  });

  it('reads FOLLOWUPS_LAUNCH_DATE when it is a valid date', () => {
    expect(followupsLaunchDateKey('2026-11-15')).toBe('2026-11-15');
    expect(followupsLaunchDateKey(' 2026-11-15 ')).toBe('2026-11-15');
    expect(followupsLaunchDateKey('not a date')).toBe(FOLLOWUPS_DEFAULT_LAUNCH_DATE);
    expect(followupsLaunchDateKey('2026-02-30')).toBe(FOLLOWUPS_DEFAULT_LAUNCH_DATE);
    expect(followupsLaunchDateKey(undefined)).toBe(FOLLOWUPS_DEFAULT_LAUNCH_DATE);
  });
});

describe('balance hold', () => {
  it('holds the gallery when anything other than "Fully paid" is recorded, including blank', () => {
    for (const paymentStatus of [null, '', 'Deposit paid', 'Balance due', 'Not paid', 'Invoice issued', 'fully paid']) {
      const a = agreement({ paymentStatus });
      expect(galleryDue(a)).toBe(false);
      expect(isGalleryEmailHeld(a, NOW, LAUNCH)).toBe(true);
      expect(galleryEmailStatus(a, NOW, LAUNCH)).toEqual({ kind: 'held' });
    }
  });

  it('only holds when everything else is eligible', () => {
    const owing = { paymentStatus: 'Deposit paid' };
    expect(isGalleryEmailHeld(agreement({ ...owing, galleryLink: null }), NOW, LAUNCH)).toBe(false);
    expect(isGalleryEmailHeld(agreement({ ...owing, followUpsPaused: true }), NOW, LAUNCH)).toBe(false);
    expect(isGalleryEmailHeld(agreement({ ...owing, event: { eventDate: eventOn('2026-10-20') } }), NOW, LAUNCH)).toBe(false);
    expect(isGalleryEmailHeld(agreement({ ...owing, status: 'CANCELLED' }), NOW, LAUNCH)).toBe(false);
  });

  it('sends once the balance is marked Fully paid', () => {
    const held = agreement({ paymentStatus: 'Balance due', galleryHeldAlertAt: new Date('2026-10-18T14:00:00.000Z') });
    expect(galleryDue(held)).toBe(false);
    expect(galleryDue({ ...held, paymentStatus: 'Fully paid' })).toBe(true);
  });

  it('alerts once per agreement', () => {
    const first = planFollowups([agreement({ paymentStatus: null })], NOW, LAUNCH);
    expect(first.held).toHaveLength(1);
    expect(first.held[0].alert).toBe(true);
    expect(first.galleryEmails).toHaveLength(0);

    const later = planFollowups(
      [agreement({ paymentStatus: null, galleryHeldAlertAt: new Date('2026-10-18T14:00:00.000Z') })],
      NOW,
      LAUNCH,
    );
    expect(later.held[0].alert).toBe(false);
  });
});

describe('review request eligibility', () => {
  // Gallery sent Saturday Oct 17 at 4pm Toronto; review due Tuesday Oct 20.
  const gallerySent = new Date('2026-10-17T20:00:00.000Z');
  const sent = (overrides: Partial<FollowupAgreement> = {}) => agreement({ galleryEmailSentAt: gallerySent, ...overrides });

  it('is due 3 Toronto days after the gallery email, on the 10am run', () => {
    expect(reviewRequestDueDateKey(gallerySent)).toBe('2026-10-20');
    expect(reviewDue(sent())).toBe(true);
    expect(reviewDue(sent(), new Date('2026-10-19T14:30:00.000Z'))).toBe(false);
    expect(reviewRequestStatus(sent(), new Date('2026-10-19T14:30:00.000Z'), LAUNCH)).toEqual({
      kind: 'scheduled',
      dateKey: '2026-10-20',
    });
  });

  it('uses the Toronto date of a late-evening send', () => {
    // 11:30pm Toronto on Oct 17 is already Oct 18 in UTC.
    expect(reviewRequestDueDateKey(new Date('2026-10-18T03:30:00.000Z'))).toBe('2026-10-20');
  });

  it('starts the clock from a manual Send now on a held gallery too', () => {
    expect(reviewDue(sent({ paymentStatus: 'Balance due' }))).toBe(true);
  });

  it('waits for the gallery email', () => {
    expect(reviewDue(agreement())).toBe(false);
    expect(reviewRequestStatus(agreement(), NOW, LAUNCH)).toEqual({ kind: 'waiting', reason: 'Waiting for the gallery email' });
  });

  it('only ever goes out once', () => {
    const done = sent({ reviewRequestSentAt: new Date('2026-10-20T14:00:00.000Z') });
    expect(reviewDue(done)).toBe(false);
    expect(reviewRequestStatus(done, NOW, LAUNCH).kind).toBe('sent');
  });

  it('is skipped when marked Already reviewed', () => {
    expect(reviewDue(sent({ reviewReceived: true }))).toBe(false);
    expect(reviewRequestStatus(sent({ reviewReceived: true }), NOW, LAUNCH)).toEqual({
      kind: 'skipped',
      reason: 'Already reviewed',
    });
  });

  it('is skipped for cancelled agreements', () => {
    expect(reviewDue(sent({ status: 'CANCELLED' }))).toBe(false);
    expect(reviewDue(sent({ cancelledAt: new Date() }))).toBe(false);
  });

  it('pauses with follow-ups and goes out on the next run after unpausing, even if overdue', () => {
    const paused = sent({ followUpsPaused: true });
    expect(reviewDue(paused)).toBe(false);
    const weekLater = new Date('2026-10-27T14:30:00.000Z');
    expect(reviewDue({ ...paused, followUpsPaused: false }, weekLater)).toBe(true);
    expect(reviewRequestStatus({ ...paused, followUpsPaused: false }, weekLater, LAUNCH)).toEqual({
      kind: 'scheduled',
      dateKey: '2026-10-27',
    });
  });

  it('is never planned in the same run as its gallery email', () => {
    const plan = planFollowups([agreement()], NOW, LAUNCH);
    expect(plan.galleryEmails).toHaveLength(1);
    expect(plan.reviewRequests).toHaveLength(0);
  });
});

describe('manual review button', () => {
  it('works on any active agreement, not just completed ones', () => {
    expect(manualReviewRefusal(agreement({ status: 'DRAFT' }))).toBeNull();
    expect(manualReviewRefusal(agreement({ status: 'SIGNED' }))).toBeNull();
  });

  it('refuses once any review request has gone out, and for inactive agreements', () => {
    expect(manualReviewRefusal(agreement({ reviewRequestSentAt: new Date() }))).toMatch(/already been sent/);
    expect(manualReviewRefusal(agreement({ status: 'CANCELLED' }))).toMatch(/cancelled/);
    expect(manualReviewRefusal(agreement({ archived: true }))).toMatch(/archived/);
  });
});

describe('run timing and environment', () => {
  it('acts only in the 10am Toronto hour, in daylight and standard time', () => {
    // October: EDT (UTC−4). 14:00 UTC is 10am, 15:00 UTC is 11am.
    expect(isFollowupRunHour(new Date('2026-10-20T14:00:00.000Z'))).toBe(true);
    expect(isFollowupRunHour(new Date('2026-10-20T14:59:00.000Z'))).toBe(true);
    expect(isFollowupRunHour(new Date('2026-10-20T15:00:00.000Z'))).toBe(false);
    // January: EST (UTC−5). 14:00 UTC is 9am, 15:00 UTC is 10am.
    expect(isFollowupRunHour(new Date('2027-01-12T14:00:00.000Z'))).toBe(false);
    expect(isFollowupRunHour(new Date('2027-01-12T15:00:00.000Z'))).toBe(true);
  });

  it('is a dry run everywhere except production', () => {
    expect(followupsDryRun('production')).toBe(false);
    expect(followupsDryRun('preview')).toBe(true);
    expect(followupsDryRun('development')).toBe(true);
    expect(followupsDryRun(undefined)).toBe(true);
  });
});
