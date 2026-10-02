import { describe, expect, it } from 'vitest';
import { agreementStatusLabel, isSigned, manualStatusChangeError, SIGNED_STATUSES } from '@/lib/agreementStatus';

describe('isSigned', () => {
  it('is true for SIGNED and COMPLETED', () => {
    expect(isSigned('SIGNED')).toBe(true);
    expect(isSigned('COMPLETED')).toBe(true);
  });

  it('is false for everything else', () => {
    for (const status of ['DRAFT', 'SENT', 'CANCELLED', '', null, undefined, 'signed']) {
      expect(isSigned(status)).toBe(false);
    }
  });

  it('matches the list the routes query with', () => {
    expect([...SIGNED_STATUSES]).toEqual(['SIGNED', 'COMPLETED']);
  });
});

describe('agreementStatusLabel', () => {
  it('labels each status', () => {
    expect(agreementStatusLabel('DRAFT')).toBe('Draft');
    expect(agreementStatusLabel('SENT')).toBe('Sent');
    expect(agreementStatusLabel('SIGNED')).toBe('Signed');
    expect(agreementStatusLabel('COMPLETED')).toBe('Completed');
    expect(agreementStatusLabel('CANCELLED')).toBe('Cancelled');
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
    ['SENT', 'SIGNED'],
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
