import { describe, expect, it } from 'vitest';
import {
  buildCalendarFeed,
  calendarFeedStatusLabel,
  calendarFeedWindow,
  isIncludedInCalendarFeed,
  parseEventDurationMinutes,
  parseEventStartTime,
  selectOneAgreementPerEvent,
  toCalendarFeedEvent,
  type CalendarFeedSource,
} from '@/lib/calendarFeed';

const NOW = new Date('2026-10-02T16:00:00.000Z');

const emptyDetails = {
  eventDate: null,
  eventLocation: null,
  eventStartTime: null,
  eventDuration: null,
  eventPackage: null,
};

function source(
  overrides: Partial<CalendarFeedSource> = {},
  event: Partial<NonNullable<CalendarFeedSource['event']>> | null = {},
): CalendarFeedSource {
  return {
    id: 'agr_123',
    status: 'SIGNED',
    archived: false,
    cancelledAt: null,
    paymentStatus: 'Deposit paid',
    client: {
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '416-555-0100',
      ...emptyDetails,
    },
    event:
      event === null
        ? null
        : {
            ...emptyDetails,
            eventDate: new Date('2026-10-10T12:00:00.000Z'),
            eventLocation: 'Royal York, Toronto',
            eventPackage: '3 hr Photo Booth',
            ...event,
          },
    backdropLink: { name: 'Alex' },
    ...overrides,
  };
}

function eventOn(isoInstant: string): CalendarFeedSource {
  return source({}, { eventDate: new Date(isoInstant) });
}

describe('calendarFeedWindow', () => {
  it('runs from 30 Toronto days ago through 18 months ahead', () => {
    expect(calendarFeedWindow(NOW)).toEqual({ fromKey: '2026-09-02', toKey: '2028-04-02' });
  });

  it('uses the Toronto day, not the UTC day', () => {
    // 01:30 UTC on Oct 3 is still Oct 2 in Toronto.
    expect(calendarFeedWindow(new Date('2026-10-03T01:30:00.000Z'))).toEqual({
      fromKey: '2026-09-02',
      toKey: '2028-04-02',
    });
  });

  it('clamps the end day to the last day of a shorter month', () => {
    expect(calendarFeedWindow(new Date('2026-08-31T16:00:00.000Z')).toKey).toBe('2028-02-29');
  });
});

describe('isIncludedInCalendarFeed', () => {
  it('includes events on the first and last day of the window', () => {
    expect(isIncludedInCalendarFeed(eventOn('2026-09-02T12:00:00.000Z'), NOW)).toBe(true);
    expect(isIncludedInCalendarFeed(eventOn('2028-04-02T12:00:00.000Z'), NOW)).toBe(true);
  });

  it('excludes events just outside the window', () => {
    expect(isIncludedInCalendarFeed(eventOn('2026-09-01T12:00:00.000Z'), NOW)).toBe(false);
    expect(isIncludedInCalendarFeed(eventOn('2028-04-03T12:00:00.000Z'), NOW)).toBe(false);
    // 03:30 UTC on Sep 2 is Sep 1 in Toronto.
    expect(isIncludedInCalendarFeed(eventOn('2026-09-02T03:30:00.000Z'), NOW)).toBe(false);
  });

  it.each(['DRAFT', 'SENT', 'SIGNED', 'COMPLETED'])('includes %s agreements', (status) => {
    expect(isIncludedInCalendarFeed(source({ status }), NOW)).toBe(true);
  });

  it('excludes cancelled and archived agreements', () => {
    expect(isIncludedInCalendarFeed(source({ status: 'CANCELLED' }), NOW)).toBe(false);
    expect(isIncludedInCalendarFeed(source({ archived: true }), NOW)).toBe(false);
    expect(isIncludedInCalendarFeed(source({ status: 'DRAFT', archived: true }), NOW)).toBe(false);
    expect(isIncludedInCalendarFeed(source({ cancelledAt: new Date() }), NOW)).toBe(false);
  });

  it('falls back to the client event date when there is no event record', () => {
    const legacy = source(
      { client: { ...source().client, eventDate: new Date('2026-11-01T12:00:00.000Z') } },
      null,
    );
    expect(isIncludedInCalendarFeed(legacy, NOW)).toBe(true);
    expect(isIncludedInCalendarFeed(source({}, { eventDate: null }), NOW)).toBe(false);
  });
});

describe('parseEventStartTime', () => {
  it.each([
    ['4:00 PM', { hour: 16, minute: 0 }],
    ['16:00:00', { hour: 16, minute: 0 }],
    ['6pm', { hour: 18, minute: 0 }],
    ['6:30 p.m.', { hour: 18, minute: 30 }],
    ['12:15 AM', { hour: 0, minute: 15 }],
    ['12 PM', { hour: 12, minute: 0 }],
    ['09:05', { hour: 9, minute: 5 }],
  ])('parses %s', (input, expected) => {
    expect(parseEventStartTime(input)).toEqual(expected);
  });

  it.each(['', 'TBD', 'evening', '25:00', '13 PM', '7:75', '18'])('rejects %j', (input) => {
    expect(parseEventStartTime(input)).toBeNull();
  });
});

describe('parseEventDurationMinutes', () => {
  it.each([
    ['3 hours', 180],
    ['2.5 hrs', 150],
    ['4 hr', 240],
    ['90 minutes', 90],
    ['1 hour 30 min', 90],
    ['4', 240],
  ])('parses %s', (input, expected) => {
    expect(parseEventDurationMinutes(input)).toBe(expected);
  });

  it.each([null, '', 'TBD', 'all night', '0 hours', '30 hours'])('rejects %j', (input) => {
    expect(parseEventDurationMinutes(input)).toBeNull();
  });
});

describe('toCalendarFeedEvent', () => {
  it('makes an all-day event when there is no start time', () => {
    const event = toCalendarFeedEvent(source());
    expect(event?.timing).toEqual({
      kind: 'allDay',
      startDateKey: '2026-10-10',
      endDateKey: '2026-10-11',
    });
  });

  it('makes an all-day event when the start time cannot be read', () => {
    expect(toCalendarFeedEvent(source({}, { eventStartTime: 'TBD' }))?.timing.kind).toBe('allDay');
  });

  it('uses the start time and duration in Toronto daylight time', () => {
    const event = toCalendarFeedEvent(
      source({}, { eventStartTime: '4:00 PM', eventDuration: '4 hours' }),
    );
    expect(event?.timing).toEqual({
      kind: 'timed',
      start: new Date('2026-10-10T20:00:00.000Z'),
      end: new Date('2026-10-11T00:00:00.000Z'),
    });
  });

  it('uses Toronto standard time in winter', () => {
    const event = toCalendarFeedEvent(
      source(
        {},
        {
          eventDate: new Date('2026-12-12T12:00:00.000Z'),
          eventStartTime: '18:00:00',
          eventDuration: '2 hours',
        },
      ),
    );
    expect(event?.timing).toEqual({
      kind: 'timed',
      start: new Date('2026-12-12T23:00:00.000Z'),
      end: new Date('2026-12-13T01:00:00.000Z'),
    });
  });

  it('defaults to 3 hours when the duration cannot be read', () => {
    const event = toCalendarFeedEvent(
      source({}, { eventStartTime: '7 PM', eventDuration: 'until late' }),
    );
    expect(event?.timing).toEqual({
      kind: 'timed',
      start: new Date('2026-10-10T23:00:00.000Z'),
      end: new Date('2026-10-11T02:00:00.000Z'),
    });
  });

  it('uses the event record details over the legacy client fields', () => {
    const event = toCalendarFeedEvent(
      source({
        client: {
          ...source().client,
          eventStartTime: '5:00 PM',
          eventLocation: 'Old venue',
          eventPackage: 'Old package',
        },
      }),
    );
    expect(event?.timing.kind).toBe('allDay');
    expect(event?.location).toBe('Royal York, Toronto');
    expect(event?.summary).toBe('Jane Smith – 3 hr Photo Booth');
  });

  it('uses the client fields when there is no event record', () => {
    const event = toCalendarFeedEvent(
      source(
        {
          client: {
            ...source().client,
            eventDate: new Date('2026-11-01T12:00:00.000Z'),
            eventStartTime: '5:00 PM',
            eventLocation: 'Legacy Hall',
            eventPackage: 'Mirror Booth',
          },
        },
        null,
      ),
    );
    expect(event?.summary).toBe('Jane Smith – Mirror Booth');
    expect(event?.location).toBe('Legacy Hall');
    expect(event?.timing).toMatchObject({ kind: 'timed', start: new Date('2026-11-01T22:00:00.000Z') });
  });

  it('fills the title, UID and description', () => {
    const event = toCalendarFeedEvent(source());
    expect(event?.uid).toBe('agr_123@agreements.photoboothguys.ca');
    expect(event?.description).toBe(
      [
        'Phone: 416-555-0100',
        'Package: 3 hr Photo Booth',
        'Attendant: Alex',
        'Payment: Deposit paid',
        'Admin: https://agreements.photoboothguys.ca/admin/agreements?agreement=agr_123',
        'Status: Signed',
      ].join('\n'),
    );
  });

  it("uses the attendant record's name over the backdrop link name", () => {
    const event = toCalendarFeedEvent(
      source({ backdropLink: { name: 'Alex link', attendant: { name: 'Alex Rivera' } } }),
    );
    expect(event?.description).toContain('Attendant: Alex Rivera');
    expect(event?.description).not.toContain('Alex link');
  });

  it('leaves out unknown details and uses the name alone without a package', () => {
    const event = toCalendarFeedEvent(
      source(
        { backdropLink: null, paymentStatus: null, client: { ...source().client, phone: null } },
        { eventPackage: null },
      ),
    );
    expect(event?.summary).toBe('Jane Smith');
    expect(event?.description).toBe(
      'Payment: Not recorded\nAdmin: https://agreements.photoboothguys.ca/admin/agreements?agreement=agr_123\nStatus: Signed',
    );
  });
});

describe('calendarFeedStatusLabel', () => {
  const twoSigners = {
    client: { ...source().client, email: 'Jane@Example.com' },
    secondSignerEnabled: true,
    requireBothSignatures: true,
    secondSignerEmail: 'sam@example.com',
  };

  it.each([
    ['DRAFT', 'Draft (not sent)'],
    ['SENT', 'Sent, not signed'],
    ['SIGNED', 'Signed'],
    ['COMPLETED', 'Completed'],
  ])('labels %s as %s', (status, label) => {
    expect(calendarFeedStatusLabel(source({ status }))).toBe(label);
  });

  it('labels a two-signer agreement with one signature as signed by one of two', () => {
    expect(
      calendarFeedStatusLabel(
        source({ ...twoSigners, status: 'SENT', signatures: [{ signerEmail: 'jane@example.com' }] }),
      ),
    ).toBe('Signed by one of two');
    expect(
      calendarFeedStatusLabel(
        source({ ...twoSigners, status: 'SENT', signatures: [{ signerEmail: 'SAM@example.com ' }] }),
      ),
    ).toBe('Signed by one of two');
  });

  it('keeps "Sent, not signed" when nobody has signed or only one signature is needed', () => {
    expect(calendarFeedStatusLabel(source({ ...twoSigners, status: 'SENT', signatures: [] }))).toBe(
      'Sent, not signed',
    );
    expect(
      calendarFeedStatusLabel(
        source({
          ...twoSigners,
          requireBothSignatures: false,
          status: 'SENT',
          signatures: [{ signerEmail: 'jane@example.com' }],
        }),
      ),
    ).toBe('Sent, not signed');
  });

  it('uses the plain signed label once both have signed', () => {
    expect(
      calendarFeedStatusLabel(
        source({
          ...twoSigners,
          status: 'SIGNED',
          signatures: [{ signerEmail: 'jane@example.com' }, { signerEmail: 'sam@example.com' }],
        }),
      ),
    ).toBe('Signed');
  });

  it('puts the status on the last line of the description', () => {
    const description = toCalendarFeedEvent(source({ status: 'DRAFT' }))?.description ?? '';
    expect(description.split('\n').pop()).toBe('Status: Draft (not sent)');
  });
});

describe('selectOneAgreementPerEvent', () => {
  const day = (n: number) => new Date(Date.UTC(2026, 8, n, 12));
  const ids = (sources: CalendarFeedSource[]) => sources.map((s) => s.id).sort();

  it('prefers the signed agreement even when a newer unsigned one exists', () => {
    const chosen = selectOneAgreementPerEvent([
      source({ id: 'draft_new', eventId: 'evt_1', status: 'DRAFT', createdAt: day(20) }),
      source({ id: 'signed_old', eventId: 'evt_1', status: 'SIGNED', createdAt: day(1) }),
      source({ id: 'sent_mid', eventId: 'evt_1', status: 'SENT', createdAt: day(10) }),
    ]);
    expect(ids(chosen)).toEqual(['signed_old']);
  });

  it('treats completed as signed', () => {
    const chosen = selectOneAgreementPerEvent([
      source({ id: 'done', eventId: 'evt_1', status: 'COMPLETED', createdAt: day(1) }),
      source({ id: 'sent', eventId: 'evt_1', status: 'SENT', createdAt: day(5) }),
    ]);
    expect(ids(chosen)).toEqual(['done']);
  });

  it('otherwise keeps the most recently created agreement', () => {
    const chosen = selectOneAgreementPerEvent([
      source({ id: 'older', eventId: 'evt_1', status: 'SENT', createdAt: day(1) }),
      source({ id: 'newer', eventId: 'evt_1', status: 'DRAFT', createdAt: day(9) }),
    ]);
    expect(ids(chosen)).toEqual(['newer']);
  });

  it('picks the newest of several signed agreements', () => {
    const chosen = selectOneAgreementPerEvent([
      source({ id: 'signed_a', eventId: 'evt_1', status: 'SIGNED', createdAt: day(1) }),
      source({ id: 'signed_b', eventId: 'evt_1', status: 'SIGNED', createdAt: day(3) }),
    ]);
    expect(ids(chosen)).toEqual(['signed_b']);
  });

  it('does not treat a half-signed agreement as signed', () => {
    const chosen = selectOneAgreementPerEvent([
      source({
        id: 'half_signed',
        eventId: 'evt_1',
        status: 'SENT',
        createdAt: day(1),
        secondSignerEnabled: true,
        requireBothSignatures: true,
        secondSignerEmail: 'sam@example.com',
        client: { ...source().client, email: 'jane@example.com' },
        signatures: [{ signerEmail: 'jane@example.com' }],
      }),
      source({ id: 'newer_draft', eventId: 'evt_1', status: 'DRAFT', createdAt: day(2) }),
    ]);
    expect(ids(chosen)).toEqual(['newer_draft']);
  });

  it('keeps one entry per event and never merges agreements without an event record', () => {
    const chosen = selectOneAgreementPerEvent([
      source({ id: 'a1', eventId: 'evt_1', status: 'SIGNED' }),
      source({ id: 'a2', eventId: 'evt_1', status: 'DRAFT' }),
      source({ id: 'b1', eventId: 'evt_2', status: 'SENT' }),
      source({ id: 'legacy_1', eventId: null }),
      source({ id: 'legacy_2', eventId: null }),
    ]);
    expect(ids(chosen)).toEqual(['a1', 'b1', 'legacy_1', 'legacy_2']);
  });
});

describe('buildCalendarFeed', () => {
  it('writes one entry per event, keeping the UID of the chosen agreement', () => {
    const feed = buildCalendarFeed(
      [
        source({ id: 'agr_draft', eventId: 'evt_1', status: 'DRAFT', createdAt: new Date('2026-09-20') }),
        source({ id: 'agr_signed', eventId: 'evt_1', status: 'SIGNED', createdAt: new Date('2026-09-01') }),
      ],
      NOW,
    );
    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(feed).toContain('UID:agr_signed@agreements.photoboothguys.ca');
    expect(feed).not.toContain('agr_draft@');
  });

  it('ignores excluded agreements when choosing the entry for an event', () => {
    const feed = buildCalendarFeed(
      [
        source({ id: 'agr_cancelled', eventId: 'evt_1', status: 'CANCELLED', createdAt: new Date('2026-09-20') }),
        source({ id: 'agr_sent', eventId: 'evt_1', status: 'SENT', createdAt: new Date('2026-09-01') }),
      ],
      NOW,
    );
    expect(feed).toContain('UID:agr_sent@agreements.photoboothguys.ca');
    expect(feed.replace(/\r\n /g, '')).toContain('\\nStatus: Sent\\, not signed');
  });

  it('writes only included agreements, with escaped and folded text', () => {
    const feed = buildCalendarFeed(
      [
        source(),
        source({ id: 'agr_old' }, { eventDate: new Date('2026-08-01T12:00:00.000Z') }),
        source({ id: 'agr_cancelled', status: 'CANCELLED' }),
      ],
      NOW,
    );
    const unfolded = feed.replace(/\r\n /g, '');

    expect(unfolded).toContain('UID:agr_123@agreements.photoboothguys.ca');
    expect(unfolded).not.toContain('agr_old@');
    expect(unfolded).not.toContain('agr_cancelled@');
    expect(unfolded).toContain('LOCATION:Royal York\\, Toronto');
    expect(unfolded).toContain('DESCRIPTION:Phone: 416-555-0100\\nPackage: 3 hr Photo Booth');
    feed.split('\r\n').forEach((line) => {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    });
  });
});
