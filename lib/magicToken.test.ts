import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateMagicToken, verifyMagicToken } from '@/lib/magicToken';

describe('magicToken', () => {
  const prevSecret = process.env.MAGIC_LINK_SECRET;
  const prevNextAuth = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    process.env.MAGIC_LINK_SECRET = 'test-magic-secret-for-unit-tests';
    delete process.env.NEXTAUTH_SECRET;
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.MAGIC_LINK_SECRET;
    else process.env.MAGIC_LINK_SECRET = prevSecret;
    if (prevNextAuth === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = prevNextAuth;
  });

  it('verifies a valid token', () => {
    const token = generateMagicToken('cli-1', 'Alice@Example.com', 'portal_login', 7);
    const payload = verifyMagicToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.clientId).toBe('cli-1');
    expect(payload?.clientEmail).toBe('alice@example.com');
    expect(payload?.purpose).toBe('portal_login');
    expect(payload!.exp).toBeGreaterThan(Date.now());
  });

  it('rejects an expired token', () => {
    const token = generateMagicToken('cli-1', 'alice@example.com', 'gallery_access', -1);
    expect(verifyMagicToken(token)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const token = generateMagicToken('cli-1', 'alice@example.com');
    const [payload] = token.split('.');
    expect(verifyMagicToken(`${payload}.not-the-real-signature`)).toBeNull();
  });

  it('rejects a tampered payload with original signature', () => {
    const token = generateMagicToken('cli-1', 'alice@example.com');
    const [, signature] = token.split('.');
    const evilPayload = Buffer.from(
      JSON.stringify({
        clientId: 'hacker',
        clientEmail: 'hacker@evil.com',
        purpose: 'portal_login',
        iat: Date.now(),
        exp: Date.now() + 86_400_000,
      }),
    ).toString('base64url');
    expect(verifyMagicToken(`${evilPayload}.${signature}`)).toBeNull();
  });

  it('rejects wrong format (not payload.signature)', () => {
    expect(verifyMagicToken('')).toBeNull();
    expect(verifyMagicToken('only-one-part')).toBeNull();
    expect(verifyMagicToken('a.b.c')).toBeNull();
    expect(verifyMagicToken('not-base64.also-not')).toBeNull();
  });
});
