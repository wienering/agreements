import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

export function constantTimeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/** PKCE S256: BASE64URL(SHA256(code_verifier)) */
export function pkceS256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}
