import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import {
  AGREEMENT_CSV_COLUMNS,
  agreementsExportFilename,
  buildAgreementsCsv,
  sanitizeSpreadsheetCell,
  selectAgreementsForExport,
  type AgreementExportSource,
} from '@/lib/agreements/exportCsv';

function agreement(overrides: {
  status?: string;
  paymentStatus?: string | null;
  signedAt?: Date | null;
  createdAt?: Date;
  backdropLink?: { name: string } | null;
  client?: Partial<AgreementExportSource['client']>;
  event?: AgreementExportSource['event'];
} = {}): AgreementExportSource {
  return {
    status: overrides.status ?? 'SIGNED',
    paymentStatus: overrides.paymentStatus === undefined ? 'Deposit paid' : overrides.paymentStatus,
    signedAt: overrides.signedAt === undefined ? new Date('2026-02-02T17:00:00Z') : overrides.signedAt,
    createdAt: overrides.createdAt ?? new Date('2026-01-10T15:00:00Z'),
    backdropLink: overrides.backdropLink === undefined ? { name: 'Sam' } : overrides.backdropLink,
    client: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '647-555-0100',
      eventDate: new Date('2026-01-01T17:00:00Z'),
      eventType: 'Corporate',
      eventLocation: 'Client Hall',
      eventPackage: 'Client package',
      packagePrice: 100,
      ...overrides.client,
    },
    event:
      overrides.event === undefined
        ? {
            eventDate: new Date('2026-06-15T16:00:00Z'),
            eventType: 'Wedding',
            eventLocation: 'The Distillery',
            eventPackage: '4 hours',
            packagePrice: 950,
          }
        : overrides.event,
  };
}

function parsedRows(csv: string): Record<string, string>[] {
  const body = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  return Papa.parse<Record<string, string>>(body, { header: true, skipEmptyLines: true }).data;
}

describe('buildAgreementsCsv', () => {
  it('uses the event record and falls back to the client', () => {
    const withEvent = agreement({});
    const clientOnly = agreement({
      event: null,
      client: {
        firstName: 'Grace',
        lastName: 'Hopper',
        eventDate: new Date('2026-07-04T16:00:00Z'),
        eventType: 'Party',
        eventLocation: 'Harbourfront',
        eventPackage: '2 hours',
        packagePrice: 550,
        phone: '416-555-0199',
      },
    });
    const blankEventFields = agreement({
      event: {
        eventDate: null,
        eventType: '   ',
        eventLocation: '',
        eventPackage: null,
        packagePrice: null,
      },
      client: {
        eventDate: new Date('2026-08-01T16:00:00Z'),
        eventType: 'Corporate',
        eventLocation: 'Client Hall',
        eventPackage: '3 hours',
        packagePrice: 750,
      },
    });

    const rows = parsedRows(buildAgreementsCsv([withEvent, clientOnly, blankEventFields]));

    expect(rows[0]).toMatchObject({
      'Event date': '2026-06-15',
      'Client first name': 'Ada',
      'Client last name': 'Lovelace',
      Email: 'ada@example.com',
      Phone: '647-555-0100',
      'Event type': 'Wedding',
      Venue: 'The Distillery',
      Package: '4 hours',
      Price: '950.00',
      'Agreement status': 'SIGNED',
      'Payment status': 'Deposit paid',
      Attendant: 'Sam',
      'Signed date': '2026-02-02',
      'Created date': '2026-01-10',
    });
    expect(rows[1]).toMatchObject({
      'Event date': '2026-07-04',
      'Event type': 'Party',
      Venue: 'Harbourfront',
      Package: '2 hours',
      Price: '550.00',
      Phone: '416-555-0199',
    });
    expect(rows[2]).toMatchObject({
      'Event date': '2026-08-01',
      'Event type': 'Corporate',
      Venue: 'Client Hall',
      Package: '3 hours',
      Price: '750.00',
    });
  });

  it('formats an evening UTC instant as the Toronto calendar date', () => {
    const rows = parsedRows(
      buildAgreementsCsv([
        agreement({
          event: {
            eventDate: new Date('2026-03-15T02:00:00Z'),
            eventType: 'Wedding',
            eventLocation: 'Hall',
            eventPackage: '4 hours',
            packagePrice: 950,
          },
        }),
      ]),
    );

    expect(rows[0]['Event date']).toBe('2026-03-14');
  });

  it('prefixes cells that a spreadsheet would treat as formulas', () => {
    const rows = parsedRows(
      buildAgreementsCsv([
        agreement({
          status: '=HYPERLINK("http://evil")',
          paymentStatus: '+cmd',
          backdropLink: { name: '@attendant' },
          client: {
            firstName: '-Ada',
            lastName: '\tHopper',
            email: '\rMAIL',
            phone: '+1 647 555 0100',
          },
          event: {
            eventDate: new Date('2026-06-15T16:00:00Z'),
            eventType: '=1+1',
            eventLocation: '+venue',
            eventPackage: '-package',
            packagePrice: -12.5,
          },
        }),
      ]),
    );

    const row = rows[0];
    expect(row['Client first name']).toBe("'-Ada");
    expect(row['Client last name']).toBe("'\tHopper");
    expect(row.Email).toBe("'\rMAIL");
    expect(row.Phone).toBe("'+1 647 555 0100");
    expect(row['Event type']).toBe("'=1+1");
    expect(row.Venue).toBe("'+venue");
    expect(row.Package).toBe("'-package");
    expect(row.Price).toBe("'-12.50");
    expect(row['Agreement status']).toBe('\'=HYPERLINK("http://evil")');
    expect(row['Payment status']).toBe("'+cmd");
    expect(row.Attendant).toBe("'@attendant");
  });

  it('leaves ordinary cells unchanged', () => {
    expect(sanitizeSpreadsheetCell('Wedding')).toBe('Wedding');
    expect(sanitizeSpreadsheetCell('950.00')).toBe('950.00');
    expect(sanitizeSpreadsheetCell('ada@example.com')).toBe('ada@example.com');
    expect(parsedRows(buildAgreementsCsv([agreement({})]))[0].Email).toBe('ada@example.com');
  });

  it('writes a UTF-8 BOM and the header row in column order', () => {
    const csv = buildAgreementsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [header] = csv.slice(1).split('\n');
    expect(header).toBe(AGREEMENT_CSV_COLUMNS.join(','));
  });
});

describe('selectAgreementsForExport', () => {
  it('keeps event dates inside the inclusive Toronto range', () => {
    const inside = agreement({});
    const clientDateIgnored = agreement({
      client: { lastName: 'Ignored', eventDate: new Date('2026-06-20T16:00:00Z') },
      event: {
        eventDate: new Date('2025-01-01T17:00:00Z'),
        eventType: 'Wedding',
        eventLocation: 'Hall',
        eventPackage: '4 hours',
        packagePrice: 950,
      },
    });
    const noDate = agreement({
      client: { lastName: 'Undated', eventDate: null },
      event: null,
    });
    const boundary = agreement({
      client: { lastName: 'Boundary' },
      event: {
        eventDate: new Date('2026-01-01T05:30:00Z'),
        eventType: 'Wedding',
        eventLocation: 'Hall',
        eventPackage: '4 hours',
        packagePrice: 950,
      },
    });

    const selected = selectAgreementsForExport(
      [clientDateIgnored, noDate, boundary, inside],
      '2026-01-01',
      '2026-12-31',
    );

    expect(selected.map((row) => row.client.lastName)).toEqual(['Boundary', 'Lovelace']);
  });
});

describe('agreementsExportFilename', () => {
  it('includes the from and to dates', () => {
    expect(agreementsExportFilename('2026-01-01', '2026-12-31')).toBe(
      'agreements-2026-01-01-to-2026-12-31.csv',
    );
  });
});
