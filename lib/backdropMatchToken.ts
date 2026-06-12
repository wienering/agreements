import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getMatchConfirmSecret(): string | null {
  return process.env.MATCH_CONFIRM_SECRET ?? null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function encodeToken(payload: string, signature: string): string {
  return Buffer.from(`${payload}|${signature}`, 'utf8').toString('base64url');
}

function decodeToken(token: string): { payload: string; signature: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const separatorIndex = decoded.lastIndexOf('|');
    if (separatorIndex <= 0) {
      return null;
    }
    const payload = decoded.slice(0, separatorIndex);
    const signature = decoded.slice(separatorIndex + 1);
    if (!payload || !signature) {
      return null;
    }
    return { payload, signature };
  } catch {
    return null;
  }
}

export type BackdropMatchTokenPayload = {
  agreementId: string;
  backdropName: string;
  submittedEventDate: string;
  expiry: number;
};

export function createBackdropMatchConfirmToken(
  agreementId: string,
  backdropName: string,
  submittedEventDate = '',
): string | null {
  const secret = getMatchConfirmSecret();
  if (!secret) {
    console.error('[backdropMatchToken] MATCH_CONFIRM_SECRET is not configured');
    return null;
  }

  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = `${agreementId}|${backdropName}|${submittedEventDate}|${expiry}`;
  const signature = signPayload(payload, secret);
  return encodeToken(payload, signature);
}

export function verifyBackdropMatchConfirmToken(token: string): BackdropMatchTokenPayload | null {
  const secret = getMatchConfirmSecret();
  if (!secret) {
    return null;
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return null;
  }

  const expectedSignature = signPayload(decoded.payload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(decoded.signature);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return null;
  }

  const parts = decoded.payload.split('|');
  if (parts.length !== 4) {
    return null;
  }

  const [agreementId, backdropName, submittedEventDate, expiryRaw] = parts;
  const expiry = Number(expiryRaw);
  if (!agreementId || !backdropName || !Number.isFinite(expiry) || Date.now() > expiry) {
    return null;
  }

  return { agreementId, backdropName, submittedEventDate, expiry };
}
