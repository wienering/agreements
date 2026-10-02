import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBalanceActionToken, verifyBalanceActionToken } from '@/lib/balanceActionToken';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('balanceActionToken', () => {
  const prevBalance = process.env.BALANCE_ACTION_SECRET;
  const prevAuth = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.BALANCE_ACTION_SECRET = 'test-balance-action-secret';
    delete process.env.NEXTAUTH_SECRET;
  });

  afterEach(() => {
    if (prevBalance === undefined) delete process.env.BALANCE_ACTION_SECRET;
    else process.env.BALANCE_ACTION_SECRET = prevBalance;
    if (prevAuth === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = prevAuth;
  });

  it('signs a token for one agreement and one action', () => {
    const now = Date.now();
    const token = createBalanceActionToken('agr-1', 'snooze', now);
    expect(token).toEqual(expect.any(String));
    const payload = verifyBalanceActionToken(token!, now);
    expect(payload).toEqual({
      agreementId: 'agr-1',
      action: 'snooze',
      expiry: now + 7 * DAY_MS,
    });
  });

  it('rejects a token once it is past its 7-day expiry', () => {
    const issued = Date.now() - 8 * DAY_MS;
    const token = createBalanceActionToken('agr-1', 'mark_paid', issued);
    expect(verifyBalanceActionToken(token!, Date.now())).toBeNull();
  });

  it('accepts a token at the exact expiry and rejects it one millisecond later', () => {
    const issued = 1_700_000_000_000;
    const token = createBalanceActionToken('agr-1', 'remind', issued)!;
    const expiry = issued + 7 * DAY_MS;
    expect(verifyBalanceActionToken(token, expiry)?.action).toBe('remind');
    expect(verifyBalanceActionToken(token, expiry + 1)).toBeNull();
  });

  it('rejects a tampered signature and a swapped action', () => {
    const token = createBalanceActionToken('agr-1', 'mark_paid')!;
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const separator = decoded.lastIndexOf('|');
    const payload = decoded.slice(0, separator);
    const signature = decoded.slice(separator + 1);
    const tamperedSignature = Buffer.from(`${payload}|${signature}x`, 'utf8').toString('base64url');
    expect(verifyBalanceActionToken(tamperedSignature)).toBeNull();

    const swapped = payload.replace('mark_paid', 'snooze');
    const tamperedAction = Buffer.from(`${swapped}|${signature}`, 'utf8').toString('base64url');
    expect(verifyBalanceActionToken(tamperedAction)).toBeNull();
  });

  it('returns null when no signing secret is configured', () => {
    delete process.env.BALANCE_ACTION_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    expect(createBalanceActionToken('agr-1', 'remind')).toBeNull();
    expect(verifyBalanceActionToken('anything')).toBeNull();
  });
});
