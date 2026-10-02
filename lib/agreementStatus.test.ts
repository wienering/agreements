import { describe, expect, it } from 'vitest';
import { isSigned, SIGNED_STATUSES } from '@/lib/agreementStatus';

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
