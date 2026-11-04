import { describe, expect, it } from 'vitest';
import {
  formatSheetDate,
  leadStatusToSheet,
  parseFollowUpDate,
  sheetStatusToLead,
  statusFromStage,
} from './status';

describe('sheetStatusToLead', () => {
  it('maps the values WF1/WF2 write', () => {
    expect(sheetStatusToLead('')).toEqual({ status: 'NEW', lostReason: null });
    expect(sheetStatusToLead('active')).toEqual({ status: 'FOLLOWING_UP', lostReason: null });
    expect(sheetStatusToLead('Booked')).toEqual({ status: 'BOOKED', lostReason: null });
    expect(sheetStatusToLead('paused')).toEqual({ status: 'PAUSED', lostReason: null });
    expect(sheetStatusToLead('dead')).toEqual({ status: 'LOST', lostReason: null });
    expect(sheetStatusToLead('no response')).toEqual({ status: 'LOST', lostReason: 'no response' });
    expect(sheetStatusToLead(' fake ')).toEqual({ status: 'LOST', lostReason: 'fake' });
  });
});

describe('leadStatusToSheet', () => {
  it('writes only the statuses that take a lead out of (or back into) the sequence', () => {
    expect(leadStatusToSheet('BOOKED', null)).toBe('booked');
    expect(leadStatusToSheet('LOST', 'fake')).toBe('fake');
    expect(leadStatusToSheet('LOST', null)).toBe('declined');
    expect(leadStatusToSheet('PAUSED', null)).toBe('paused');
    expect(leadStatusToSheet('FOLLOWING_UP', null, 'PAUSED')).toBe('active');
    expect(leadStatusToSheet('FOLLOWING_UP', null, 'NEW')).toBeNull();
    expect(leadStatusToSheet('NEW', null)).toBeNull();
  });
});

describe('statusFromStage', () => {
  it('matches the migration backfill', () => {
    expect(statusFromStage('QUOTE_REQUESTED')).toBe('NEW');
    expect(statusFromStage('QUOTE_SENT')).toBe('NEW');
    expect(statusFromStage('AGREEMENT_SENT')).toBe('BOOKED');
    expect(statusFromStage('SIGNED')).toBe('BOOKED');
    expect(statusFromStage('LOST')).toBe('LOST');
  });
});

describe('follow-up dates', () => {
  it('reads the Sheet format as a Toronto calendar date and writes it back the same way', () => {
    const d = parseFollowUpDate('9/23/2026');
    expect(d).not.toBeNull();
    expect(formatSheetDate(d!)).toBe('9/23/2026');
  });

  it('reads ISO dates and rejects junk', () => {
    expect(formatSheetDate(parseFollowUpDate('2026-11-06')!)).toBe('11/6/2026');
    expect(parseFollowUpDate('')).toBeNull();
    expect(parseFollowUpDate('soon')).toBeNull();
  });
});
