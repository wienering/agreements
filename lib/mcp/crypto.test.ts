import { describe, expect, it } from 'vitest';
import { constantTimeEqualString, pkceS256Challenge, sha256Hex } from '@/lib/mcp/crypto';

describe('mcp crypto', () => {
  it('hashes stably', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });

  it('compares secrets in constant time', () => {
    expect(constantTimeEqualString('secret', 'secret')).toBe(true);
    expect(constantTimeEqualString('secret', 'Secret')).toBe(false);
    expect(constantTimeEqualString('short', 'longer')).toBe(false);
  });

  it('computes PKCE S256 challenges', () => {
    // RFC 7636 appendix B
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(pkceS256Challenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});
