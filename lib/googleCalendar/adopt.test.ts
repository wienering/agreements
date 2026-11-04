import { describe, expect, it } from 'vitest';
import { pickEntryToAdopt } from '@/lib/googleCalendar/adopt';

const client = { firstName: 'Tiffany', lastName: 'Gin', email: 'tiffany.gin@proton.me' };

describe('pickEntryToAdopt', () => {
  it('takes over the Bookly entry titled with the client name', () => {
    expect(
      pickEntryToAdopt(
        [
          { id: 'other', summary: 'Ian Smith 3 Hour Photo Booth Rental' },
          { id: 'bookly', summary: 'Tiffany Gin 2 Hour Photo Booth Rental' },
        ],
        client,
      ),
    ).toBe('bookly');
  });

  it('matches on the email in the details when the title uses another name', () => {
    expect(
      pickEntryToAdopt([{ id: 'bookly', summary: 'TG Wedding', description: 'Email: <a>Tiffany.Gin@proton.me</a>' }], client),
    ).toBe('bookly');
  });

  it('never takes an entry the CRM made, a cancelled one, or an ambiguous pair', () => {
    expect(
      pickEntryToAdopt(
        [{ id: 'crm', summary: 'Tiffany Gin 2 Hour', extendedProperties: { private: { crmEventId: 'evt_9' } } }],
        client,
      ),
    ).toBeNull();
    expect(pickEntryToAdopt([{ id: 'gone', summary: 'Tiffany Gin', status: 'cancelled' }], client)).toBeNull();
    expect(
      pickEntryToAdopt(
        [
          { id: 'a', summary: 'Tiffany Gin ceremony' },
          { id: 'b', summary: 'Tiffany Gin reception' },
        ],
        client,
      ),
    ).toBeNull();
  });
});
