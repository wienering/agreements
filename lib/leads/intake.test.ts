import { describe, expect, it } from 'vitest';
import { leadSourceFromPage, parseHours, parseLooseEventDate, splitName } from './intake';

const day = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

describe('parseLooseEventDate', () => {
  it('reads the formats seen in the Sheet', () => {
    expect(day(parseLooseEventDate('May 29, 2027'))).toBe('2027-05-29');
    expect(day(parseLooseEventDate('Friday, November 27th, 2026'))).toBe('2026-11-27');
    expect(day(parseLooseEventDate('Saturday, October 24, 2026'))).toBe('2026-10-24');
    expect(day(parseLooseEventDate('2025-12-13'))).toBe('2025-12-13');
    expect(day(parseLooseEventDate('Aug 28, 2026'))).toBe('2026-08-28');
  });
  it('gives up when there is no year', () => {
    expect(parseLooseEventDate('Thursday August 13th')).toBeNull();
    expect(parseLooseEventDate('August 26')).toBeNull();
    expect(parseLooseEventDate('')).toBeNull();
  });
});

describe('leadSourceFromPage', () => {
  it('uses the quote page to tell the forms apart', () => {
    expect(leadSourceFromPage('https://www.photoboothguys.ca/photobooth-quotes/')).toBe('QUOTE');
    expect(leadSourceFromPage('https://www.photoboothguys.ca/book/')).toBe('BOOKING_FORM');
    expect(leadSourceFromPage('')).toBe('BOOKING_FORM');
  });
});

describe('parseHours and splitName', () => {
  it('parses hours', () => {
    expect(parseHours('4 hours')).toBe(4);
    expect(parseHours('')).toBeNull();
    expect(parseHours(3)).toBe(3);
  });
  it('splits names', () => {
    expect(splitName('Jane', 'Doe')).toEqual({ firstName: 'Jane', lastName: 'Doe' });
    expect(splitName('', '', 'Jane van Doe')).toEqual({ firstName: 'Jane', lastName: 'van Doe' });
    expect(splitName('', 'Hardy')).toEqual({ firstName: 'Hardy', lastName: '' });
  });
});
