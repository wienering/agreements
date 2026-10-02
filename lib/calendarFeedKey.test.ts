import { createHmac } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calendarFeedUrl,
  getCalendarFeedKey,
  isValidCalendarFeedKey,
} from '@/lib/calendarFeedKey';

function expectedKey(secret: string): string {
  return createHmac('sha256', secret).update('calendar-feed-v1').digest('base64url');
}

describe('calendar feed key', () => {
  beforeEach(() => {
    vi.stubEnv('CALENDAR_FEED_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', 'nextauth-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('derives the key from NEXTAUTH_SECRET when no feed secret is set', () => {
    expect(getCalendarFeedKey()).toBe(expectedKey('nextauth-secret'));
  });

  it('prefers CALENDAR_FEED_SECRET when it is set', () => {
    vi.stubEnv('CALENDAR_FEED_SECRET', 'feed-secret');
    expect(getCalendarFeedKey()).toBe(expectedKey('feed-secret'));
    expect(isValidCalendarFeedKey(expectedKey('nextauth-secret'))).toBe(false);
  });

  it('accepts the correct key', () => {
    expect(isValidCalendarFeedKey(expectedKey('nextauth-secret'))).toBe(true);
  });

  it('rejects missing, empty, wrong and truncated keys', () => {
    const key = expectedKey('nextauth-secret');
    expect(isValidCalendarFeedKey(null)).toBe(false);
    expect(isValidCalendarFeedKey(undefined)).toBe(false);
    expect(isValidCalendarFeedKey('')).toBe(false);
    expect(isValidCalendarFeedKey(expectedKey('other-secret'))).toBe(false);
    expect(isValidCalendarFeedKey(key.slice(0, -1))).toBe(false);
    expect(isValidCalendarFeedKey(`${key}x`)).toBe(false);
  });

  it('rejects every key when no secret is configured', () => {
    vi.stubEnv('NEXTAUTH_SECRET', '');
    expect(getCalendarFeedKey()).toBeNull();
    expect(isValidCalendarFeedKey(expectedKey('nextauth-secret'))).toBe(false);
    expect(isValidCalendarFeedKey('')).toBe(false);
  });

  it('builds the feed URL with an encoded key', () => {
    expect(calendarFeedUrl('https://example.com/', 'a+b/c')).toBe(
      'https://example.com/api/calendar/feed.ics?key=a%2Bb%2Fc',
    );
  });
});
