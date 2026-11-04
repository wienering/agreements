import { OAuth2Client } from 'google-auth-library';
import type { GoogleCalendarEventBody } from '@/lib/googleCalendar/format';

/**
 * Google Calendar API access for photoboothguys.ca@gmail.com. Uses the same Google OAuth client as
 * Drive, with its own refresh token (GOOGLE_CALENDAR_REFRESH_TOKEN) that carries calendar access.
 * Sync is off until that token is set.
 */

const API = 'https://www.googleapis.com/calendar/v3';

let client: OAuth2Client | null = null;

/**
 * On when the calendar token is set, and only on the live site, so testing on a laptop or a
 * preview (same database) never writes calendar entries. GOOGLE_CALENDAR_SYNC_ANYWHERE=true overrides.
 */
export function isGoogleCalendarConfigured(): boolean {
  const live = process.env.VERCEL_ENV === 'production' || process.env.GOOGLE_CALENDAR_SYNC_ANYWHERE === 'true';
  return Boolean(
    live &&
      process.env.GOOGLE_CALENDAR_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  );
}

function calendarId(): string {
  return encodeURIComponent(process.env.GOOGLE_CALENDAR_ID?.trim() || 'primary');
}

function getClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    );
    client.setCredentials({ refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN });
  }
  return client;
}

export class CalendarApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'CalendarApiError';
  }
}

async function call<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T | null> {
  const { token } = await getClient().getAccessToken();
  if (!token) throw new CalendarApiError(401, 'No Google access token');
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new CalendarApiError(response.status, `Google Calendar ${method} ${response.status}: ${text.slice(0, 300)}`);
  }
  if (response.status === 204) return null;
  return (await response.json()) as T;
}

export async function insertCalendarEvent(body: GoogleCalendarEventBody): Promise<string> {
  const created = await call<{ id: string }>('POST', `/calendars/${calendarId()}/events`, body);
  if (!created?.id) throw new CalendarApiError(500, 'Google Calendar did not return an event id');
  return created.id;
}

export async function patchCalendarEvent(googleEventId: string, body: GoogleCalendarEventBody): Promise<void> {
  await call('PATCH', `/calendars/${calendarId()}/events/${encodeURIComponent(googleEventId)}`, body);
}

/** Deletes the entry. An entry that's already gone counts as deleted. */
export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  try {
    await call('DELETE', `/calendars/${calendarId()}/events/${encodeURIComponent(googleEventId)}`);
  } catch (error) {
    if (error instanceof CalendarApiError && (error.status === 404 || error.status === 410)) return;
    throw error;
  }
}
