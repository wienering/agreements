import { describe, expect, it } from 'vitest';
import {
  agreementStatusLabel,
  canonicalStatus,
  isSent,
  isSigned,
  manualStatusChangeError,
  SIGNED_STATUSES,
} from '@/lib/agreementStatus';

describe('isSigned', () => {
  it('is true for SIGNED and COMPLETED', () => {
    expect(isSigned('SIGNED')).toBe(true);
    expect(isSigned('COMPLETED')).toBe(true);
  });

  it('is false for everything else', () => {
    for (const status of ['DRAFT', 'SENT', 'LIVE', 'CANCELLED', 'VOID', '', null, undefined, 'signed']) {
      expect(isSigned(status)).toBe(false);
    }
  });

  it('matches the list the routes query with', () => {
    expect([...SIGNED_STATUSES]).toEqual(['SIGNED', 'COMPLETED']);
  });
});

describe('SENT and the old LIVE', () => {
  it('treats LIVE as SENT', () => {
    expect(isSent('SENT')).toBe(true);
    expect(isSent('LIVE')).toBe(true);
    expect(isSent('DRAFT')).toBe(false);
    expect(isSent('SIGNED')).toBe(false);
    expect(canonicalStatus('LIVE')).toBe('SENT');
    expect(canonicalStatus('SIGNED')).toBe('SIGNED');
    expect(agreementStatusLabel('LIVE')).toBe('Sent');
    expect(agreementStatusLabel('SENT')).toBe('Sent');
  });
});

describe('manualStatusChangeError', () => {
  it.each([
    ['SIGNED', 'COMPLETED'],
    ['SIGNED', 'CANCELLED'],
    ['SIGNED', 'SIGNED'],
    ['COMPLETED', 'SIGNED'],
    ['COMPLETED', 'CANCELLED'],
    ['DRAFT', 'SENT'],
    ['SENT', 'DRAFT'],
    ['LIVE', 'SIGNED'],
    ['SENT', 'COMPLETED'],
    ['CANCELLED', 'SIGNED'],
  ] as const)('allows %s to %s', (from, to) => {
    expect(manualStatusChangeError(from, to)).toBeNull();
  });

  it.each([
    ['SIGNED', 'DRAFT'],
    ['SIGNED', 'SENT'],
    ['COMPLETED', 'DRAFT'],
    ['COMPLETED', 'SENT'],
    ['DRAFT', 'CANCELLED'],
    ['SENT', 'CANCELLED'],
  ] as const)('refuses %s to %s', (from, to) => {
    expect(manualStatusChangeError(from, to)).not.toBeNull();
  });
});
