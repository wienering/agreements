import { createHash, createHmac, timingSafeEqual } from 'crypto';

const CALENDAR_FEED_KEY_MESSAGE = 'calendar-feed-v1';

function getCalendarFeedSecret(): string | null {
  return process.env.CALENDAR_FEED_SECRET || process.env.NEXTAUTH_SECRET || null;
}

/** The feed key: HMAC-SHA256 of a fixed label. Null when no secret is configured. */
export function getCalendarFeedKey(): string | null {
  const secret = getCalendarFeedSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(CALENDAR_FEED_KEY_MESSAGE).digest('base64url');
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/** Constant-time key check. Hashing both sides first keeps the comparison length-independent. */
export function isValidCalendarFeedKey(candidate: string | null | undefined): boolean {
  const expected = getCalendarFeedKey();
  if (!expected || !candidate) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}

export const CALENDAR_FEED_PATH = '/api/calendar/feed.ics';

export function calendarFeedUrl(origin: string, key: string): string {
  return `${origin.replace(/\/+$/, '')}${CALENDAR_FEED_PATH}?key=${encodeURIComponent(key)}`;
}
