import { describe, expect, it } from 'vitest';
import {
  ERROR_ALERT_WINDOW_MS,
  buildErrorAlertSignature,
  shouldSendErrorAlert,
} from '@/lib/errorAlert';

const now = new Date('2026-10-02T16:00:00Z');
const signature = buildErrorAlertSignature('/api/agreements/send', 'database timed out');

function recent(elapsedMs: number, recentSignature = signature) {
  return {
    signature: recentSignature,
    createdAt: new Date(now.getTime() - elapsedMs),
  };
}

describe('shouldSendErrorAlert', () => {
  it('sends when this route and message have not been alerted', () => {
    expect(shouldSendErrorAlert({ now, signature, recent: null })).toBe(true);
  });

  it('suppresses the same route and message inside the hour', () => {
    expect(
      shouldSendErrorAlert({
        now,
        signature,
        recent: recent(30 * 60 * 1000),
      }),
    ).toBe(false);
    expect(
      shouldSendErrorAlert({
        now,
        signature,
        recent: recent(ERROR_ALERT_WINDOW_MS - 1),
      }),
    ).toBe(false);
  });

  it('sends the same error again once a full hour has passed', () => {
    expect(
      shouldSendErrorAlert({
        now,
        signature,
        recent: recent(ERROR_ALERT_WINDOW_MS),
      }),
    ).toBe(true);
    expect(
      shouldSendErrorAlert({
        now,
        signature,
        recent: recent(ERROR_ALERT_WINDOW_MS + 1000),
      }),
    ).toBe(true);
  });

  it('sends a different message on the same route during the window', () => {
    const other = buildErrorAlertSignature('/api/agreements/send', 'template missing');
    expect(
      shouldSendErrorAlert({
        now,
        signature: other,
        recent: recent(60 * 1000, signature),
      }),
    ).toBe(true);
  });

  it('treats the redacted route and message as the dedupe key', () => {
    const withSecrets = buildErrorAlertSignature(
      '/api/agreements/send?token=super-secret&signature=abc',
      'failed for ada@example.com at 647-555-0199 Bearer abc.def.ghi',
    );
    const again = buildErrorAlertSignature(
      '/api/agreements/send?token=other-secret',
      'failed for grace@example.com at (416) 555-0148 Bearer zzz.yyy.xxx',
    );

    expect(withSecrets).toBe(again);
    expect(withSecrets).not.toContain('@');
    expect(withSecrets).not.toContain('super-secret');
    expect(withSecrets).not.toContain('647-555-0199');
    expect(withSecrets).not.toContain('416');
    expect(withSecrets).toContain('[redacted-email]');
    expect(withSecrets).toContain('[redacted-phone]');
    expect(withSecrets).toContain('[redacted-token]');
    expect(
      shouldSendErrorAlert({
        now,
        signature: again,
        recent: recent(5 * 60 * 1000, withSecrets),
      }),
    ).toBe(false);
  });
});
