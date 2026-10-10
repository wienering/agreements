import { describe, expect, it } from 'vitest';
import { clientMatchesSearch, filterClientsBySearch, type ClientForSearch } from './search';

const chris: ClientForSearch = {
  firstName: 'Chris',
  lastName: 'Hill',
  email: 'chris@slixer.com',
  phone: '(416) 555-1234',
  events: [{ eventType: 'Wedding', eventLocation: 'Toronto' }],
};

const other: ClientForSearch = {
  firstName: 'Dana',
  lastName: 'Smith',
  email: 'dana@example.com',
  phone: '905-222-9876',
  events: [],
};

describe('clientMatchesSearch', () => {
  it('matches a full name across first and last name fields', () => {
    expect(clientMatchesSearch(chris, 'chris hill')).toBe(true);
    expect(clientMatchesSearch(chris, 'CHRIS HILL')).toBe(true);
    expect(clientMatchesSearch(chris, '  chris   hill  ')).toBe(true);
    expect(clientMatchesSearch(chris, 'hill chris')).toBe(true);
  });

  it('matches a first name alone', () => {
    expect(clientMatchesSearch(chris, 'Chris')).toBe(true);
  });

  it('matches part of the email', () => {
    expect(clientMatchesSearch(chris, 'slixer')).toBe(true);
  });

  it('matches a phone fragment as typed or as digits only', () => {
    expect(clientMatchesSearch(chris, '555-12')).toBe(true);
    expect(clientMatchesSearch(chris, '55512')).toBe(true);
    expect(clientMatchesSearch(chris, '4165551234')).toBe(true);
    expect(clientMatchesSearch(chris, '777')).toBe(false);
  });

  it('skips the digits-only phone match for words with fewer than 3 digits', () => {
    // "65" appears in the phone's digits (4165551234) but not in its text
    expect(clientMatchesSearch(chris, '65')).toBe(false);
    expect(clientMatchesSearch(chris, '655')).toBe(true);
  });

  it('requires every word to match', () => {
    expect(clientMatchesSearch(chris, 'chris smith')).toBe(false);
    expect(clientMatchesSearch(chris, 'chris wedding')).toBe(true);
  });
});

describe('filterClientsBySearch', () => {
  it('returns every client for an empty query', () => {
    expect(filterClientsBySearch([chris, other], '   ')).toEqual([chris, other]);
  });

  it('returns only matching clients', () => {
    expect(filterClientsBySearch([chris, other], 'chris hill')).toEqual([chris]);
    expect(filterClientsBySearch([chris, other], 'slixer')).toEqual([chris]);
  });
});
