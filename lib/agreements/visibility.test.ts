import { describe, expect, it } from 'vitest';
import { isUnsentDraft } from '@/lib/agreements/visibility';

describe('isUnsentDraft', () => {
  it('flags a draft that was never emailed or opened', () => {
    expect(isUnsentDraft({ status: 'DRAFT', emailSendCount: 0, lastEmailedAt: null, firstViewedAt: null })).toBe(true);
  });

  it('keeps a draft that was emailed', () => {
    expect(isUnsentDraft({ status: 'DRAFT', emailSendCount: 1 })).toBe(false);
    expect(isUnsentDraft({ status: 'DRAFT', emailSendCount: 0, lastEmailedAt: '2026-11-01T12:00:00Z' })).toBe(false);
  });

  it('keeps a draft the client opened from a copied link', () => {
    expect(isUnsentDraft({ status: 'DRAFT', emailSendCount: 0, firstViewedAt: '2026-11-01T12:00:00Z' })).toBe(false);
  });

  it('never flags other statuses', () => {
    for (const status of ['SENT', 'SIGNED', 'COMPLETED', 'CANCELLED']) {
      expect(isUnsentDraft({ status, emailSendCount: 0 })).toBe(false);
    }
  });
});
