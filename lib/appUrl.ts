/** The public address of the app. Links in emails and cron output always use this. */
export const PRODUCTION_APP_URL = 'https://agreements.photoboothguys.ca';

/**
 * Base URL for every link we send out (emails, digests, cron output).
 *
 * Reads APP_URL and falls back to the production domain. It never uses the request's host:
 * Vercel crons and server calls arrive on the per-deployment *.vercel.app address, which sits
 * behind Vercel's deployment protection login. Set APP_URL=http://localhost:3000 for local dev.
 */
export function appUrl(): string {
  const configured = process.env.APP_URL?.trim();
  return (configured || PRODUCTION_APP_URL).replace(/\/+$/, '');
}
