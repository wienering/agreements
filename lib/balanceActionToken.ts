import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const BALANCE_ACTIONS = ['mark_paid', 'remind', 'snooze'] as const;
export type BalanceAction = (typeof BALANCE_ACTIONS)[number];

export type BalanceActionTokenPayload = {
  agreementId: string;
  action: BalanceAction;
  expiry: number;
};

function getBalanceActionSecret(): string | null {
  return process.env.BALANCE_ACTION_SECRET || process.env.NEXTAUTH_SECRET || null;
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

function isBalanceAction(value: string): value is BalanceAction {
  return (BALANCE_ACTIONS as readonly string[]).includes(value);
}

export function createBalanceActionToken(
  agreementId: string,
  action: BalanceAction,
  now = Date.now(),
): string | null {
  const secret = getBalanceActionSecret();
  if (!secret) {
    console.error('[balanceActionToken] BALANCE_ACTION_SECRET is not configured');
    return null;
  }

  const expiry = now + TOKEN_TTL_MS;
  const payload = `${agreementId}|${action}|${expiry}`;
  const signature = signPayload(payload, secret);
  return encodeToken(payload, signature);
}

export function verifyBalanceActionToken(
  token: string,
  now = Date.now(),
): BalanceActionTokenPayload | null {
  const secret = getBalanceActionSecret();
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
  if (parts.length !== 3) {
    return null;
  }

  const [agreementId, action, expiryRaw] = parts;
  const expiry = Number(expiryRaw);
  if (!agreementId || !isBalanceAction(action) || !Number.isFinite(expiry) || now > expiry) {
    return null;
  }

  return { agreementId, action, expiry };
}

export function balanceActionPath(token: string): string {
  return `/admin/balance-action/${encodeURIComponent(token)}`;
}

export function adminAgreementPath(agreementId: string): string {
  return `/admin/agreements?agreement=${encodeURIComponent(agreementId)}`;
}
