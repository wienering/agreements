import Papa from 'papaparse';
import {
  formatDateToronto,
  resolveAgreementEventDate,
  torontoDateKey,
} from '@/lib/dates';
import { displayPaymentStatus } from '@/lib/paymentStatus';

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const AGREEMENT_CSV_COLUMNS = [
  'Event date',
  'Client first name',
  'Client last name',
  'Email',
  'Phone',
  'Event type',
  'Venue',
  'Package',
  'Price',
  'Agreement status',
  'Payment status',
  'Attendant',
  'Signed date',
  'Created date',
] as const;

type CsvColumn = (typeof AGREEMENT_CSV_COLUMNS)[number];

type PriceValue = { toString(): string } | number | string | null;

export type AgreementExportSource = {
  status: string;
  paymentStatus: string | null;
  signedAt: Date | null;
  createdAt: Date;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    eventDate: Date | null;
    eventType: string | null;
    eventLocation: string | null;
    eventPackage: string | null;
    packagePrice: PriceValue;
  };
  event?: {
    eventDate: Date | null;
    eventType: string | null;
    eventLocation: string | null;
    eventPackage: string | null;
    packagePrice: PriceValue;
  } | null;
  backdropLink?: { name: string; attendant?: { name: string } | null } | null;
};

/** Spreadsheet apps treat a leading = + - @ tab or CR as a formula. */
export function sanitizeSpreadsheetCell(value: string): string {
  if (FORMULA_PREFIX.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function agreementsExportFilename(fromKey: string, toKey: string): string {
  return `agreements-${fromKey}-to-${toKey}.csv`;
}

export function selectAgreementsForExport(
  agreements: AgreementExportSource[],
  fromKey: string,
  toKey: string,
): AgreementExportSource[] {
  return agreements
    .filter((agreement) => {
      const eventDate = resolveAgreementEventDate(agreement);
      if (!eventDate) return false;
      const key = torontoDateKey(eventDate);
      return key >= fromKey && key <= toKey;
    })
    .sort((left, right) => {
      const leftKey = torontoDateKey(resolveAgreementEventDate(left) as Date);
      const rightKey = torontoDateKey(resolveAgreementEventDate(right) as Date);
      if (leftKey !== rightKey) return leftKey < rightKey ? -1 : 1;
      const leftName = `${left.client.lastName} ${left.client.firstName}`.toLocaleLowerCase();
      const rightName = `${right.client.lastName} ${right.client.firstName}`.toLocaleLowerCase();
      if (leftName < rightName) return -1;
      if (leftName > rightName) return 1;
      return 0;
    });
}

const UTF8_BOM = '\uFEFF';

export function buildAgreementsCsv(agreements: AgreementExportSource[]): string {
  const body =
    agreements.length === 0
      ? `${AGREEMENT_CSV_COLUMNS.join(',')}\n`
      : Papa.unparse(agreements.map(agreementToCsvRecord), {
          columns: [...AGREEMENT_CSV_COLUMNS],
          newline: '\n',
        });
  return `${UTF8_BOM}${body}`;
}

function agreementToCsvRecord(agreement: AgreementExportSource): Record<CsvColumn, string> {
  const eventDate = resolveAgreementEventDate(agreement);
  return {
    'Event date': csvDate(eventDate),
    'Client first name': cell(agreement.client.firstName),
    'Client last name': cell(agreement.client.lastName),
    Email: cell(agreement.client.email),
    Phone: cell(agreement.client.phone),
    'Event type': cell(preferText(agreement.event?.eventType, agreement.client.eventType)),
    Venue: cell(preferText(agreement.event?.eventLocation, agreement.client.eventLocation)),
    Package: cell(preferText(agreement.event?.eventPackage, agreement.client.eventPackage)),
    Price: cell(formatPrice(agreement.event?.packagePrice ?? agreement.client.packagePrice)),
    'Agreement status': cell(agreement.status),
    'Payment status': cell(displayPaymentStatus(agreement.paymentStatus)),
    Attendant: cell(agreement.backdropLink?.attendant?.name || agreement.backdropLink?.name),
    'Signed date': csvDate(agreement.signedAt),
    'Created date': csvDate(agreement.createdAt),
  };
}

function preferText(eventValue?: string | null, clientValue?: string | null): string {
  const fromEvent = eventValue?.trim();
  if (fromEvent) return fromEvent;
  return clientValue?.trim() ?? '';
}

function csvDate(value: Date | null): string {
  if (!value) return '';
  const formatted = formatDateToronto(value);
  return formatted === '—' ? '' : sanitizeSpreadsheetCell(formatted);
}

function formatPrice(value: PriceValue | undefined): string {
  if (value == null || value === '') return '';
  const numeric = typeof value === 'number' ? value : Number(value.toString());
  if (!Number.isFinite(numeric)) return value.toString();
  return numeric.toFixed(2);
}

function cell(value: string | null | undefined): string {
  if (value == null) return '';
  const withoutOuterSpaces = value.replace(/^[ ]+|[ ]+$/g, '');
  return sanitizeSpreadsheetCell(withoutOuterSpaces);
}
