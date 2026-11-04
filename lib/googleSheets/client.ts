import { OAuth2Client } from 'google-auth-library';

/**
 * Google Sheets access for the "Pre-Booking Leads Not Booked" sheet (photoboothguys.ca@gmail.com).
 * Same Google OAuth client as Drive and Calendar, with its own refresh token
 * (GOOGLE_SHEETS_REFRESH_TOKEN, spreadsheets scope). Sync is off until that token is set.
 *
 * Env:
 *   GOOGLE_SHEETS_REFRESH_TOKEN  token from `npx tsx scripts/google-calendar-auth.ts --sheets`
 *   LEADS_SHEET_ID               spreadsheet id
 *   LEADS_SHEET_TAB              tab name (default "Sheet1")
 *   GOOGLE_SHEETS_SYNC_ANYWHERE  "true" to allow writes outside production (local testing)
 */

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

let client: OAuth2Client | null = null;

/** Only the live site writes to the Sheet, so a laptop or preview (same database) never does. */
export function isLeadsSheetConfigured(): boolean {
  const live = process.env.VERCEL_ENV === 'production' || process.env.GOOGLE_SHEETS_SYNC_ANYWHERE === 'true';
  return Boolean(
    live &&
      process.env.GOOGLE_SHEETS_REFRESH_TOKEN &&
      process.env.LEADS_SHEET_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  );
}

export function leadsSheetTab(): string {
  return process.env.LEADS_SHEET_TAB?.trim() || 'Sheet1';
}

function getClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    );
    client.setCredentials({ refresh_token: process.env.GOOGLE_SHEETS_REFRESH_TOKEN });
  }
  return client;
}

export class SheetsApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'SheetsApiError';
  }
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const { token } = await getClient().getAccessToken();
  if (!token) throw new SheetsApiError(401, 'No Google access token');
  const sheetId = encodeURIComponent((process.env.LEADS_SHEET_ID as string).trim());
  const response = await fetch(`${API}/${sheetId}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new SheetsApiError(response.status, `Google Sheets ${method} ${response.status}: ${text.slice(0, 300)}`);
  }
  return (await response.json()) as T;
}

function quotedTab(): string {
  return `'${leadsSheetTab().replace(/'/g, "''")}'`;
}

/** All values on the leads tab (header row first), as displayed text. */
export async function readLeadsSheet(): Promise<string[][]> {
  const range = encodeURIComponent(`${quotedTab()}!A1:ZZ`);
  const result = await call<{ values?: string[][] }>('GET', `/values/${range}?valueRenderOption=FORMATTED_VALUE`);
  return result.values ?? [];
}

/** Write single cells. `cells` is a list of [A1 cell without tab, value]. Values are entered as typed. */
export async function writeLeadsSheetCells(cells: Array<[string, string]>): Promise<void> {
  if (cells.length === 0) return;
  await call('POST', '/values:batchUpdate', {
    valueInputOption: 'USER_ENTERED',
    data: cells.map(([cell, value]) => ({ range: `${quotedTab()}!${cell}`, values: [[value]] })),
  });
}
