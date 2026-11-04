import { timingSafeEqual } from 'crypto';

/**
 * Auth for calls from n8n: `Authorization: Bearer <N8N_API_SECRET>`.
 * Rejects everything when the secret isn't set.
 */
export function verifyN8nSecret(request: Request): boolean {
  const secret = process.env.N8N_API_SECRET;
  if (!secret) {
    console.error('[n8n] N8N_API_SECRET is not set, rejecting request');
    return false;
  }
  const header = request.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
