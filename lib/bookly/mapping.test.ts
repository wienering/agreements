import { afterEach, describe, expect, it } from 'vitest';
import {
  hasUnlimitedPrintsExtra,
  mapBooklyToClient,
  parseDate,
  parsePrice,
  splitName,
} from '@/lib/bookly/mapping';
import { fromTorontoDateTimeLocalInput, torontoDateKey } from '@/lib/dates';

describe('splitName', () => {
  it('returns empty parts for missing or blank input', () => {
    expect(splitName(undefined)).toEqual({ firstName: '', lastName: '' });
    expect(splitName('')).toEqual({ firstName: '', lastName: '' });
    expect(splitName('   ')).toEqual({ firstName: '', lastName: '' });
  });

  it('keeps a single token as the first name', () => {
    expect(splitName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
  });

  it('uses the last word as the last name when there is no company keyword', () => {
    expect(splitName('  Alice   Smith  ')).toEqual({
      firstName: 'Alice',
      lastName: 'Smith',
    });
    expect(splitName('Anthony Di Principe')).toEqual({
      firstName: 'Anthony Di',
      lastName: 'Principe',
    });
  });

  it('splits after the last company keyword', () => {
    expect(splitName('Nonstop Entertainment Anthony Di Principe')).toEqual({
      firstName: 'Nonstop Entertainment',
      lastName: 'Anthony Di Principe',
    });
    expect(splitName('ABC Entertainment LLC John Doe')).toEqual({
      firstName: 'ABC Entertainment LLC',
      lastName: 'John Doe',
    });
  });

  it('matches company keywords case-insensitively and ignores one trailing period or comma', () => {
    expect(splitName('Acme STUDIOS, Jane Roe')).toEqual({
      firstName: 'Acme STUDIOS,',
      lastName: 'Jane Roe',
    });
  });

  it('falls back to a last-word split when the keyword is the final token', () => {
    expect(splitName('Jane Photo')).toEqual({ firstName: 'Jane', lastName: 'Photo' });
  });
});

describe('parseDate', () => {
  it('returns null for empty or unparseable values', () => {
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('parses an ISO date string', () => {
    const parsed = parseDate('2026-06-15T16:00:00.000Z');
    expect(parsed?.toISOString()).toBe('2026-06-15T16:00:00.000Z');
  });
});

describe('parsePrice', () => {
  it('returns null for empty or non-numeric values', () => {
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice(null as unknown as undefined)).toBeNull();
    expect(parsePrice('free')).toBeNull();
    expect(parsePrice('')).toBeNull();
  });

  it('keeps numeric values, including zero', () => {
    expect(parsePrice(1200)).toBe(1200);
    expect(parsePrice(0)).toBe(0);
    expect(parsePrice(-15)).toBe(-15);
  });

  it('strips currency symbols and thousands separators', () => {
    expect(parsePrice('$1,200.50')).toBe(1200.5);
    expect(parsePrice('CAD 99')).toBe(99);
  });
});

describe('hasUnlimitedPrintsExtra', () => {
  const previous = process.env.BOOKLY_UNLIMITED_PRINTS_EXTRA_ID;

  afterEach(() => {
    if (previous === undefined) delete process.env.BOOKLY_UNLIMITED_PRINTS_EXTRA_ID;
    else process.env.BOOKLY_UNLIMITED_PRINTS_EXTRA_ID = previous;
  });

  it('returns false for null, empty, empty collections, and malformed JSON', () => {
    expect(hasUnlimitedPrintsExtra(null)).toBe(false);
    expect(hasUnlimitedPrintsExtra(undefined)).toBe(false);
    expect(hasUnlimitedPrintsExtra('')).toBe(false);
    expect(hasUnlimitedPrintsExtra('   ')).toBe(false);
    expect(hasUnlimitedPrintsExtra('[]')).toBe(false);
    expect(hasUnlimitedPrintsExtra('{}')).toBe(false);
    expect(hasUnlimitedPrintsExtra('{not json')).toBe(false);
    expect(hasUnlimitedPrintsExtra([])).toBe(false);
  });

  it('detects quantity >= 1 for the default extra id "2"', () => {
    expect(hasUnlimitedPrintsExtra('{"2":1}')).toBe(true);
    expect(hasUnlimitedPrintsExtra({ '2': '3' })).toBe(true);
    expect(hasUnlimitedPrintsExtra({ '2': 1, '5': 1 })).toBe(true);
  });

  it('returns false when the extra is missing, null, or quantity is below 1', () => {
    expect(hasUnlimitedPrintsExtra({ '1': 1 })).toBe(false);
    expect(hasUnlimitedPrintsExtra({ '2': 0 })).toBe(false);
    expect(hasUnlimitedPrintsExtra({ '2': '0' })).toBe(false);
    expect(hasUnlimitedPrintsExtra({ '2': null as unknown as number })).toBe(false);
    expect(hasUnlimitedPrintsExtra({ '2': 'nope' })).toBe(false);
  });

  it('honours BOOKLY_UNLIMITED_PRINTS_EXTRA_ID', () => {
    process.env.BOOKLY_UNLIMITED_PRINTS_EXTRA_ID = ' 7 ';
    expect(hasUnlimitedPrintsExtra({ '7': 1, '2': 1 })).toBe(true);
    expect(hasUnlimitedPrintsExtra({ '2': 1 })).toBe(false);
  });
});

describe('mapBooklyToClient', () => {
  it('prefers root fields over nested customer / appointment / service', () => {
    const mapped = mapBooklyToClient({
      email: ' Alice@Example.com ',
      firstName: 'Alice',
      lastName: 'Smith',
      phone: '555-0100',
      fullName: 'Ignored Name',
      bookingDate: '2026-06-15',
      bookingTime: '16:00:00',
      serviceName: 'Wedding',
      eventPackage: 'Premium',
      location: 'Toronto',
      duration: '4 hours',
      price: '$1,200.00',
      notes: 'Root notes',
      customer: {
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'Person',
        phone: '000',
        notes: 'Nested notes',
      },
      appointment: { date: '2026-01-01', location: 'Elsewhere', duration: '1 hour' },
      service: { name: 'Other service', price: 10 },
    });

    expect(mapped.email).toBe('alice@example.com');
    expect(mapped.firstName).toBe('Alice');
    expect(mapped.lastName).toBe('Smith');
    expect(mapped.phone).toBe('555-0100');
    expect(mapped.eventType).toBe('Wedding');
    expect(mapped.eventPackage).toBe('Premium');
    expect(mapped.eventLocation).toBe('Toronto');
    expect(mapped.eventDuration).toBe('4 hours');
    expect(mapped.packagePrice).toBe(1200);
    expect(mapped.notes).toBe('Root notes');
    expect(mapped.eventStartTime).toBe('16:00:00');
    // Combined "YYYY-MM-DDTHH:mm:ss" has no timezone, so Date parses it as host local time.
    expect(mapped.eventDate?.toISOString()).toBe(new Date('2026-06-15T16:00:00').toISOString());
  });

  it('falls back to nested objects and splits a full name', () => {
    const mapped = mapBooklyToClient({
      customer: {
        email: 'Bob@Venue.com',
        fullName: 'Nonstop Entertainment Anthony Di Principe',
        phone: '555-0199',
        notes: 'Nested notes',
      },
      appointment: { startDate: '2026-07-01', startTime: '18:30:00', location: 'Hall' },
      service: { type: 'Corporate', duration: '2 hours', price: 800 },
    });

    expect(mapped.email).toBe('bob@venue.com');
    expect(mapped.firstName).toBe('Nonstop Entertainment');
    expect(mapped.lastName).toBe('Anthony Di Principe');
    expect(mapped.phone).toBe('555-0199');
    expect(mapped.notes).toBe('Nested notes');
    expect(mapped.eventLocation).toBe('Hall');
    expect(mapped.eventType).toBe('Corporate');
    expect(mapped.eventDuration).toBe('2 hours');
    expect(mapped.packagePrice).toBe(800);
    expect(mapped.eventStartTime).toBe('18:30:00');
    expect(mapped.eventDate).not.toBeNull();
  });

  it('uses Customer when no name is available', () => {
    const mapped = mapBooklyToClient({ email: 'a@b.com' });
    expect(mapped.firstName).toBe('Customer');
    expect(mapped.lastName).toBe('');
    expect(mapped.phone).toBeNull();
    expect(mapped.eventDate).toBeNull();
    expect(mapped.packagePrice).toBeNull();
    expect(mapped.notes).toBeNull();
  });

  it('does not invent a date from a time with no date', () => {
    const mapped = mapBooklyToClient({
      email: 'a@b.com',
      firstName: 'Ann',
      bookingTime: '18:00:00',
    });
    expect(mapped.eventDate).toBeNull();
    expect(mapped.eventStartTime).toBe('18:00:00');
  });

  // Bug: a date-only bookingDate is parsed with `new Date`, which treats
  // YYYY-MM-DD as UTC midnight. In America/Toronto that is the previous evening,
  // so 2026-06-15 displays as 2026-06-14.
  it('keeps a date-only booking on that America/Toronto calendar day', () => {
    const mapped = mapBooklyToClient({ email: 'a@b.com', bookingDate: '2026-06-15' });
    expect(torontoDateKey(mapped.eventDate!)).toBe('2026-06-15');
    // Admin UI stores datetime-local 00:00 as a Toronto wall-clock instant.
    expect(mapped.eventDate?.toISOString()).toBe(
      fromTorontoDateTimeLocalInput('2026-06-15T00:00').toISOString(),
    );
  });

  it('falls back to the date alone when the combined date-time is invalid', () => {
    const mapped = mapBooklyToClient({
      email: 'a@b.com',
      firstName: 'Ann',
      bookingDate: '2026-08-01',
      bookingTime: 'not-a-time',
    });
    expect(mapped.eventDate?.toISOString().startsWith('2026-08-01')).toBe(true);
  });

  it('treats a blank phone as null', () => {
    expect(mapBooklyToClient({ email: 'a@b.com', phone: '' }).phone).toBeNull();
  });

  // Bug: `data.price || data.packagePrice || data.service?.price` treats 0 as
  // missing, so an explicit free price is dropped (or replaced by the next field).
  it('keeps an explicit price of 0', () => {
    expect(mapBooklyToClient({ email: 'a@b.com', price: 0 }).packagePrice).toBe(0);
  });
});
