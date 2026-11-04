import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addTorontoCalendarDaysFrom, torontoDayBoundsUtc } from '@/lib/dates';
import { pickEntryToAdopt } from '@/lib/googleCalendar/adopt';
import { isAlbertaLocation, parseStoredCalendarId, storeCalendarId } from '@/lib/googleCalendar/region';
import {
  CalendarApiError,
  deleteCalendarEvent,
  insertCalendarEvent,
  isGoogleCalendarConfigured,
  listCalendarEvents,
  albertaCalendarConfigured,
  type CalendarKey,
  patchCalendarEvent,
} from '@/lib/googleCalendar/client';
import { buildGoogleCalendarEvent } from '@/lib/googleCalendar/format';

const syncSelect = {
  id: true,
  archived: true,
  status: true,
  eventDate: true,
  eventLocation: true,
  eventStartTime: true,
  eventDuration: true,
  eventPackage: true,
  packagePrice: true,
  eventPhone: true,
  notes: true,
  unlimitedPrints: true,
  paymentStatus: true,
  selectedBackdropName: true,
  googleCalendarEventId: true,
  client: { select: { firstName: true, lastName: true, email: true, phone: true } },
  backdropLink: { select: { name: true, attendant: { select: { name: true } } } },
  agreements: { where: { archived: false, status: { not: 'CANCELLED' as const } }, select: { status: true } },
} as const;

export type CalendarSyncResult = 'created' | 'adopted' | 'updated' | 'removed' | 'skipped' | 'not_configured' | 'failed';

/**
 * Make the Google Calendar match one event: create or update the entry while the event is live and
 * dated, remove it once the event is cancelled, archived or undated. Never throws.
 */
export async function syncEventToGoogleCalendar(eventId: string): Promise<CalendarSyncResult> {
  if (!isGoogleCalendarConfigured()) return 'not_configured';
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: syncSelect });
    if (!event) return 'skipped';
    const body = event.archived || event.status === 'CANCELLED' ? null : buildGoogleCalendarEvent(event);
    const stored = event.googleCalendarEventId ? parseStoredCalendarId(event.googleCalendarEventId) : null;
    // Alberta venues go on the Alberta calendar (when one is set up), everything else on the main one.
    const target: CalendarKey = albertaCalendarConfigured() && isAlbertaLocation(event.eventLocation) ? 'alberta' : 'main';

    const clearStored = () =>
      prisma.event.update({ where: { id: eventId }, data: { googleCalendarEventId: null, googleCalendarSyncedAt: new Date() } });

    if (!body) {
      if (!stored) return 'skipped';
      await deleteCalendarEvent(stored.id, stored.key);
      await clearStored();
      return 'removed';
    }

    if (stored && stored.key !== target) {
      // The venue moved provinces (or the Alberta calendar was just set up): move the entry.
      await deleteCalendarEvent(stored.id, stored.key);
      await clearStored();
    } else if (stored) {
      try {
        await patchCalendarEvent(stored.id, body, stored.key);
        await prisma.event.update({ where: { id: eventId }, data: { googleCalendarSyncedAt: new Date() } });
        return 'updated';
      } catch (error) {
        // Deleted by hand in Google Calendar: make a new entry.
        if (!(error instanceof CalendarApiError && (error.status === 404 || error.status === 410))) throw error;
      }
    }

    // An entry Bookly already made for this booking is taken over instead of adding a second one.
    const adopted = event.eventDate ? await findEntryToAdopt(event, event.eventDate, target) : null;
    if (adopted) {
      await patchCalendarEvent(adopted, body, target);
      await prisma.event.update({
        where: { id: eventId },
        data: { googleCalendarEventId: storeCalendarId(target, adopted), googleCalendarSyncedAt: new Date() },
      });
      return 'adopted';
    }

    const googleEventId = await insertCalendarEvent(body, target);
    await prisma.event.update({
      where: { id: eventId },
      data: { googleCalendarEventId: storeCalendarId(target, googleEventId), googleCalendarSyncedAt: new Date() },
    });
    return 'created';
  } catch (error) {
    console.error('[google-calendar] sync failed for event', eventId, error);
    return 'failed';
  }
}

/**
 * Queue a sync to run after the response is sent (inside a request), or run it now otherwise.
 * Call after any change to an event, its client details, attendant or agreements.
 */
export function queueCalendarSync(eventId: string | null | undefined): void {
  if (!eventId || !isGoogleCalendarConfigured()) return;
  const task = () => syncEventToGoogleCalendar(eventId);
  try {
    after(task);
  } catch {
    // Not inside a request (a script or test): run it without waiting.
    void task();
  }
}

/**
 * Nightly catch-up: every event from yesterday on, plus any synced event that should now be
 * off the calendar. Fixes anything a missed hook left behind (client edits, agreement changes).
 */
export async function reconcileGoogleCalendar(now = new Date()) {
  const summary: Record<CalendarSyncResult, number> = {
    created: 0,
    adopted: 0,
    updated: 0,
    removed: 0,
    skipped: 0,
    not_configured: 0,
    failed: 0,
  };
  if (!isGoogleCalendarConfigured()) {
    summary.not_configured = 1;
    return summary;
  }
  const from = addTorontoCalendarDaysFrom(now, -1);
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { archived: false, status: { not: 'CANCELLED' }, eventDate: { gte: from } },
        { googleCalendarEventId: { not: null }, OR: [{ archived: true }, { status: 'CANCELLED' }, { eventDate: null }] },
      ],
    },
    select: { id: true },
  });
  for (const event of events) {
    summary[await syncEventToGoogleCalendar(event.id)] += 1;
  }
  return summary;
}

/** Queue a sync for every event of a client (their name, phone or email changed). */
export async function queueCalendarSyncForClient(clientId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;
  const events = await prisma.event.findMany({
    where: { clientId, googleCalendarEventId: { not: null } },
    select: { id: true },
  });
  for (const event of events) queueCalendarSync(event.id);
}

/** The one entry on the event's day that another tool (Bookly) made for this client, if any. */
async function findEntryToAdopt(
  event: { client: { firstName: string; lastName: string; email: string } },
  eventDate: Date,
  key: CalendarKey,
): Promise<string | null> {
  const { start, end } = torontoDayBoundsUtc(eventDate);
  const entries = await listCalendarEvents(start, end, key);
  const storedForms = entries.map((entry) => storeCalendarId(key, entry.id));
  const claimed = new Set(
    (
      await prisma.event.findMany({
        where: { googleCalendarEventId: { in: storedForms } },
        select: { googleCalendarEventId: true },
      })
    ).map((row) => row.googleCalendarEventId),
  );
  return pickEntryToAdopt(entries.filter((entry) => !claimed.has(storeCalendarId(key, entry.id))), event.client);
}
