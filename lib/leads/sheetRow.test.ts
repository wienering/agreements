import { describe, expect, it } from 'vitest';
import { columnLetter, findLeadRow, findSheetColumns } from './sheetRow';

const header = ['lead_id', 'submitted_at', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'event_date', 'city', 'hours', 'utm_source', 'customer_id', 'status', 'approved_at', 'followup_sent_at', 'notes', 'body', 'number of follow ups', 'next follow-up date', 'new status'];

function row(leadId: string, email: string): string[] {
  const r = new Array(header.length).fill('');
  r[0] = leadId;
  r[5] = email;
  return r;
}

describe('findSheetColumns', () => {
  it('finds the columns by header name', () => {
    expect(findSheetColumns(header)).toEqual({ leadId: 0, email: 5, newStatus: 19, nextFollowUp: 18 });
  });
  it('returns null when a column is missing', () => {
    expect(findSheetColumns(['lead_id', 'email'])).toBeNull();
  });
});

describe('findLeadRow', () => {
  const rows = [header, row('111', 'a@x.com'), row('222', 'b@x.com'), row('333', 'A@x.com')];
  const columns = findSheetColumns(header)!;

  it('matches lead_id first', () => {
    expect(findLeadRow(rows, columns, { sheetLeadId: '222', email: 'a@x.com' })).toBe(3);
  });
  it('falls back to the newest row with the email, ignoring case', () => {
    expect(findLeadRow(rows, columns, { sheetLeadId: '999', email: 'a@x.com' })).toBe(4);
  });
  it('returns null when nothing matches', () => {
    expect(findLeadRow(rows, columns, { email: 'z@x.com' })).toBeNull();
  });
});

describe('columnLetter', () => {
  it('converts indexes', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(19)).toBe('T');
    expect(columnLetter(26)).toBe('AA');
  });
});
