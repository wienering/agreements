import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarEvent, type CalendarSyncSource } from '@/lib/googleCalendar/format';

function source(overrides: Partial<CalendarSyncSource> = {}): CalendarSyncSource {
  return {
    id: 'evt_1',
    eventDate: new Date('2026-11-21T17:00:00.000Z'),
    eventLocation: 'SixtyEight at Scotia Plaza - 40 King St W 68th floor',
    eventStartTime: '9:00 pm',
    eventDuration: '2 hours',
    eventPackage: '2 Hour Photo Booth Rental',
    packagePrice: 850,
    eventPhone: null,
    notes: 'Set up by the bar',
    internalNotes: 'START TIME TBC',
    unlimitedPrints: true,
    paymentStatus: 'Deposit paid',
    selectedBackdropName: null,
    client: { firstName: 'Tiffany', lastName: 'Gin', email: 'tiffany@example.com', phone: '+16475550100' },
    backdropLink: { name: 'default-backdrop-1', attendant: { name: 'Dennis' } },
    agreements: [],
    ...overrides,
  };
}

describe('buildGoogleCalendarEvent', () => {
  it('lays the entry out like Bookly', () => {
    const body = buildGoogleCalendarEvent(source())!;
    expect(body.summary).toBe('Tiffany Gin 2 Hour Photo Booth Rental');
    expect(body.location).toContain('SixtyEight');
    expect(body.description).toContain('Attendant: Dennis');
    expect(body.description).toContain('November 21, 2026');
    expect(body.description).toContain('Start Time: 9:00 pm - 2 hours');
    expect(body.description).toContain('Contact Phone: +16475550100');
    expect(body.description).toContain('Backdrop: To be selected');
    expect(body.description).toContain('<b>Unlimited Prints</b>');
    expect(body.description).toContain('Additional Info:<br><b>Unlimited Prints</b><br><b>Set up by the bar</b>');
    expect(body.description).toContain('Internal Notes: <b>START TIME TBC</b>');
    expect(body.description).toContain('Payment Status: Deposit paid');
    expect(body.description).toContain('Agreement: None');
    expect(body.reminders.overrides).toEqual([{ method: 'popup', minutes: 90 }]);
    expect(body.extendedProperties.private.crmEventId).toBe('evt_1');
  });

  it('is timed 9pm to 11pm Toronto when the start time reads', () => {
    const body = buildGoogleCalendarEvent(source())!;
    expect(body.start).toEqual({ dateTime: '2026-11-22T02:00:00.000Z', timeZone: 'America/Toronto' });
    expect(body.end).toEqual({ dateTime: '2026-11-22T04:00:00.000Z', timeZone: 'America/Toronto' });
  });

  it('is all-day when there is no start time, and null without a date', () => {
    const allDay = buildGoogleCalendarEvent(source({ eventStartTime: null }))!;
    expect(allDay.start).toEqual({ date: '2026-11-21' });
    expect(allDay.end).toEqual({ date: '2026-11-22' });
    expect(buildGoogleCalendarEvent(source({ eventDate: null }))).toBeNull();
  });

  it('escapes client text and prefers the day-of phone', () => {
    const body = buildGoogleCalendarEvent(source({ notes: '<script>x</script>', eventPhone: '416-555-0199' }))!;
    expect(body.description).not.toContain('<script>');
    expect(body.description).toContain('Contact Phone: 416-555-0199');
  });
});
