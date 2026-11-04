import { describe, expect, it } from 'vitest';
import { isAlbertaLocation, parseStoredCalendarId, storeCalendarId } from '@/lib/googleCalendar/region';

describe('isAlbertaLocation', () => {
  it('spots Alberta venues by province or city', () => {
    expect(isAlbertaLocation('Fairmont Palliser (Foothills Gala) — 133 9 Ave SW, Calgary, AB T2P 2M3')).toBe(true);
    expect(isAlbertaLocation('The NASH - 925 11 St SE, Calgary AB')).toBe(true);
    expect(isAlbertaLocation('Edmonton Convention Centre')).toBe(true);
  });

  it('leaves Ontario venues and blanks alone', () => {
    expect(isAlbertaLocation('Mississauga Convention Centre')).toBe(false);
    expect(isAlbertaLocation('181 Bay St. Toronto')).toBe(false);
    expect(isAlbertaLocation('Abbey Road Banquet Hall')).toBe(false);
    expect(isAlbertaLocation(null)).toBe(false);
  });
});

describe('stored calendar ids', () => {
  it('round-trips the calendar with the entry id', () => {
    expect(parseStoredCalendarId(storeCalendarId('alberta', 'abc123'))).toEqual({ key: 'alberta', id: 'abc123' });
    expect(parseStoredCalendarId('abc123')).toEqual({ key: 'main', id: 'abc123' });
  });
});
