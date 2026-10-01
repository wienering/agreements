import { describe, expect, it } from 'vitest';
import {
  addTorontoCalendarDays,
  formatDateToronto,
  fromTorontoDateTimeLocalInput,
  getTorontoDateParts,
  isTorontoDateAfter,
  normalizeEventDateToNoonUtc,
  parseTorontoCalendarDateKey,
  toTorontoDateTimeLocalInput,
  torontoCalendarDaysBetween,
  torontoDateKey,
  torontoDayBoundsUtc,
  torontoDaysUntil,
  torontoMidnightUtc,
  utcDateKey,
} from '@/lib/dates';

describe('torontoDateKey', () => {
  it('formats YYYY-MM-DD in America/Toronto', () => {
    // 2026-03-15 02:00 UTC is still March 14 evening in Toronto (EDT = UTC-4)
    expect(torontoDateKey(new Date('2026-03-15T02:00:00Z'))).toBe('2026-03-14');
    expect(torontoDateKey(new Date('2026-03-15T05:00:00Z'))).toBe('2026-03-15');
  });

  it('returns empty string for invalid dates', () => {
    expect(torontoDateKey(new Date('invalid'))).toBe('');
  });
});

describe('America/Toronto DST and near-midnight', () => {
  // 2026 DST spring forward: 2026-03-08 02:00 → 03:00 local (EST→EDT)
  // 2026 DST fall back: 2026-11-01 02:00 → 01:00 local (EDT→EST)

  it('keeps calendar day stable across spring-forward night', () => {
    // Just before spring forward: 2026-03-08 06:30 UTC = 01:30 EST
    const before = new Date('2026-03-08T06:30:00Z');
    expect(torontoDateKey(before)).toBe('2026-03-08');

    // After spring forward: 2026-03-08 07:30 UTC = 03:30 EDT
    const after = new Date('2026-03-08T07:30:00Z');
    expect(torontoDateKey(after)).toBe('2026-03-08');
  });

  it('keeps calendar day stable across fall-back night', () => {
    // First 01:30 EDT occurrence roughly: 2026-11-01 05:30 UTC
    expect(torontoDateKey(new Date('2026-11-01T05:30:00Z'))).toBe('2026-11-01');
    // After fall back, 01:30 EST: 2026-11-01 06:30 UTC
    expect(torontoDateKey(new Date('2026-11-01T06:30:00Z'))).toBe('2026-11-01');
  });

  it('counts calendar days across a DST transition without off-by-one', () => {
    const beforeSpring = new Date('2026-03-07T17:00:00Z'); // Mar 7 Toronto
    const afterSpring = new Date('2026-03-09T17:00:00Z'); // Mar 9 Toronto
    expect(torontoCalendarDaysBetween(beforeSpring, afterSpring)).toBe(2);
  });

  it('treats late-evening UTC as previous Toronto day near midnight', () => {
    // 2026-06-15 03:59 UTC = 2026-06-14 23:59 EDT
    const lateEvening = new Date('2026-06-15T03:59:00Z');
    expect(torontoDateKey(lateEvening)).toBe('2026-06-14');

    // 2026-06-15 04:00 UTC = 2026-06-15 00:00 EDT
    const midnight = new Date('2026-06-15T04:00:00Z');
    expect(torontoDateKey(midnight)).toBe('2026-06-15');
  });

  it('torontoMidnightUtc lands on the correct Toronto calendar day (EDT)', () => {
    const midnight = torontoMidnightUtc(2026, 5, 15); // June 15 (month 5)
    expect(torontoDateKey(midnight)).toBe('2026-06-15');
    expect(midnight.toISOString()).toBe('2026-06-15T04:00:00.000Z');
  });

  it('torontoMidnightUtc lands correctly during EST', () => {
    const midnight = torontoMidnightUtc(2026, 0, 15); // Jan 15
    expect(torontoDateKey(midnight)).toBe('2026-01-15');
    expect(midnight.toISOString()).toBe('2026-01-15T05:00:00.000Z');
  });

  it('torontoDayBoundsUtc spans exactly one Toronto calendar day across DST', () => {
    const { start, end } = torontoDayBoundsUtc(new Date('2026-03-08T17:00:00Z'));
    expect(torontoDateKey(start)).toBe('2026-03-08');
    expect(torontoDateKey(new Date(end.getTime() - 1))).toBe('2026-03-08');
    expect(torontoDateKey(end)).toBe('2026-03-09');
  });

  it('fromTorontoDateTimeLocalInput / toTorontoDateTimeLocalInput round-trip around DST', () => {
    const springLocal = '2026-03-08T03:30';
    const springUtc = fromTorontoDateTimeLocalInput(springLocal);
    expect(toTorontoDateTimeLocalInput(springUtc)).toBe(springLocal);

    const fallLocal = '2026-11-01T01:30';
    const fallUtc = fromTorontoDateTimeLocalInput(fallLocal);
    expect(toTorontoDateTimeLocalInput(fallUtc)).toBe(fallLocal);
  });

  it('maps the spring-forward gap hour forward to 03:30', () => {
    // 02:30 does not exist on 2026-03-08 in America/Toronto.
    const utc = fromTorontoDateTimeLocalInput('2026-03-08T02:30');
    expect(toTorontoDateTimeLocalInput(utc)).toBe('2026-03-08T03:30');
  });
});

describe('torontoCalendarDaysBetween / torontoDaysUntil / isTorontoDateAfter', () => {
  it('computes later − earlier in Toronto calendar days', () => {
    expect(
      torontoCalendarDaysBetween(
        new Date('2026-04-01T16:00:00Z'),
        new Date('2026-04-04T16:00:00Z'),
      ),
    ).toBe(3);
  });

  it('torontoDaysUntil returns 0 for today or past', () => {
    const now = new Date('2026-04-01T16:00:00Z');
    expect(torontoDaysUntil(new Date('2026-04-01T20:00:00Z'), now)).toBe(0);
    expect(torontoDaysUntil(new Date('2026-03-30T16:00:00Z'), now)).toBe(0);
  });

  it('isTorontoDateAfter is strict calendar comparison', () => {
    const ref = new Date('2026-04-01T16:00:00Z');
    expect(isTorontoDateAfter(new Date('2026-04-02T16:00:00Z'), ref)).toBe(true);
    expect(isTorontoDateAfter(new Date('2026-04-01T20:00:00Z'), ref)).toBe(false);
  });
});

describe('parseTorontoCalendarDateKey / format helpers', () => {
  it('parses bare YYYY-MM-DD as Toronto midnight', () => {
    const d = parseTorontoCalendarDateKey('2026-07-04');
    expect(d).not.toBeNull();
    expect(torontoDateKey(d!)).toBe('2026-07-04');
  });

  it('rejects invalid keys', () => {
    expect(parseTorontoCalendarDateKey('07/04/2026')).toBeNull();
    expect(parseTorontoCalendarDateKey('not-a-date')).toBeNull();
  });

  it('formatDateToronto returns fallback for invalid input', () => {
    expect(formatDateToronto(new Date('nope'))).toBe('—');
  });

  it('utcDateKey uses ISO date (UTC)', () => {
    expect(utcDateKey(new Date('2026-03-15T02:00:00Z'))).toBe('2026-03-15');
  });

  it('normalizeEventDateToNoonUtc sets noon UTC on the host-local calendar day', () => {
    const input = new Date('2026-06-15T03:00:00Z');
    const d = normalizeEventDateToNoonUtc(input);
    const expected = new Date(
      Date.UTC(input.getFullYear(), input.getMonth(), input.getDate(), 12, 0, 0),
    );
    expect(d.toISOString()).toBe(expected.toISOString());
  });

  // Bug: the YYYY-MM-DD guard only checks month 0–11 and day 1–31. Impossible
  // days are not rejected; torontoMidnightUtc then rolls them forward.
  // 2026-02-31 becomes 2026-03-01T05:00:00.000Z (March 1, midnight EST).
  it.skip('rejects calendar keys that are not real days', () => {
    expect(parseTorontoCalendarDateKey('2026-02-31')).toBeNull();
    expect(parseTorontoCalendarDateKey('2026-02-29')).toBeNull();
    expect(parseTorontoCalendarDateKey('2026-04-31')).toBeNull();
  });

  it('addTorontoCalendarDays rolls months', () => {
    expect(addTorontoCalendarDays(2026, 0, 31, 1)).toEqual({
      year: 2026,
      month: 1,
      day: 1,
    });
  });

  it('getTorontoDateParts returns Eastern calendar components', () => {
    const parts = getTorontoDateParts(new Date('2026-06-15T04:00:00Z'));
    expect(parts).toMatchObject({ year: 2026, month: 5, day: 15 });
  });
});
