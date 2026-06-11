import { NextRequest } from 'next/server';

export function verifyCronSecret(request: NextRequest | Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron] CRON_SECRET is not set, rejecting request');
    return false;
  }

  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}
