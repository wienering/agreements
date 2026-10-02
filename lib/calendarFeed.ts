import { adminAgreementPath } from '@/lib/balanceActionToken';
import {
  addTorontoCalendarDays,
  fromTorontoDateTimeLocalInput,
  getTorontoDateParts,
  resolveAgreementEventDate,
  torontoDateKey,
  TORONTO_TZ,
} from '@/lib/dates';
import { buildIcsCalendar, type IcsEvent } from '@/lib/ics';

export const CALENDAR_FEED_PAST_DAYS = 30;
export const CALENDAR_FEED_FUTURE_MONTHS = 18;
export const DEFAULT_EVENT_DURATION_MINUTES = 3 * 60;

const ADMIN_ORIGIN = 'https://agreements.photoboothguys.ca';
const UID_DOMAIN = 'agreements.photoboothguys.ca';
const MAX_DURATION_MINUTES = 24 * 60;

type EventDetailFields = {
  eventDate: Date | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
};

export type CalendarFeedSource = {
  id: string;
  status: string;
  archived: boolean;
  cancelledAt: Date | null;
  paymentStatus: string | null;
  updatedAt?: Date | null;
  client: EventDetailFields & {
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  event?: EventDetailFields | null;
  backdropLink?: { name: string } | null;
};

function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Inclusive Toronto date-key window: 30 days ago through 18 months ahead. */
export function calendarFeedWindow(now = new Date()): { fromKey: string; toKey: string } {
  const today = getTorontoDateParts(now);
  const from = addTorontoCalendarDays(today.year, today.month, today.day, -CALENDAR_FEED_PAST_DAYS);

  const monthIndex = today.month + CALENDAR_FEED_FUTURE_MONTHS;
  const toYear = today.year + Math.floor(monthIndex / 12);
  const toMonth = monthIndex % 12;
  const daysInToMonth = new Date(Date.UTC(toYear, toMonth + 1, 0)).getUTCDate();

  return {
    fromKey: dateKeyFromParts(from.year, from.month, from.day),
    toKey: dateKeyFromParts(toYear, toMonth, Math.min(today.day, daysInToMonth)),
  };
}

export function isIncludedInCalendarFeed(source: CalendarFeedSource, now = new Date()): boolean {
  if (source.status !== 'SIGNED' || source.archived || source.cancelledAt) return false;
  const eventDate = resolveAgreementEventDate(source);
  if (!eventDate) return false;
  const key = torontoDateKey(eventDate);
  const { fromKey, toKey } = calendarFeedWindow(now);
  return key >= fromKey && key <= toKey;
}

/** Parse a start time such as "4:00 PM", "16:00:00", "6pm" or "6:30 p.m.". */
export function parseEventStartTime(
  value: string | null | undefined,
): { hour: number; minute: number } | null {
  const text = value?.trim().toLowerCase();
  if (!text) return null;

  const match = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/.exec(text);
  if (!match) return null;

  const [, hourText, minuteText, periodText] = match;
  if (minuteText === undefined && periodText === undefined) return null;

  let hour = parseInt(hourText, 10);
  const minute = minuteText === undefined ? 0 : parseInt(minuteText, 10);
  if (minute > 59) return null;

  if (periodText) {
    if (hour < 1 || hour > 12) return null;
    const isPm = periodText.startsWith('p');
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

/**
 * Parse a duration such as "3 hours", "2.5 hrs", "90 minutes" or "1 hour 30 min" into minutes.
 * A bare number is read as hours. Returns null when nothing sensible can be read.
 */
export function parseEventDurationMinutes(value: string | null | undefined): number | null {
  const text = value?.trim().toLowerCase();
  if (!text) return null;

  let minutes: number;
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    minutes = parseFloat(text) * 60;
  } else {
    const hours = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/.exec(text);
    const mins = /(\d+)\s*(?:minutes?|mins?|m)\b/.exec(text);
    if (!hours && !mins) return null;
    minutes = (hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1], 10) : 0);
  }

  minutes = Math.round(minutes);
  return minutes > 0 && minutes <= MAX_DURATION_MINUTES ? minutes : null;
}

/** Event details from the Event record when linked, otherwise the legacy client fields. */
function eventDetails(source: CalendarFeedSource) {
  const from = source.event ?? source.client;
  return {
    location: from.eventLocation?.trim() || null,
    startTime: from.eventStartTime?.trim() || null,
    duration: from.eventDuration?.trim() || null,
    packageName: from.eventPackage?.trim() || null,
  };
}

function nextDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const next = addTorontoCalendarDays(year, month - 1, day, 1);
  return dateKeyFromParts(next.year, next.month, next.day);
}

export function adminAgreementUrl(agreementId: string): string {
  return `${ADMIN_ORIGIN}${adminAgreementPath(agreementId)}`;
}

export function toCalendarFeedEvent(source: CalendarFeedSource): IcsEvent | null {
  const eventDate = resolveAgreementEventDate(source);
  if (!eventDate) return null;

  const dateKey = torontoDateKey(eventDate);
  const details = eventDetails(source);
  const clientName = `${source.client.firstName} ${source.client.lastName}`.trim();
  const adminUrl = adminAgreementUrl(source.id);

  const start = parseEventStartTime(details.startTime);
  let timing: IcsEvent['timing'] = {
    kind: 'allDay',
    startDateKey: dateKey,
    endDateKey: nextDateKey(dateKey),
  };
  if (start) {
    const hh = String(start.hour).padStart(2, '0');
    const mm = String(start.minute).padStart(2, '0');
    const startInstant = fromTorontoDateTimeLocalInput(`${dateKey}T${hh}:${mm}`);
    if (!Number.isNaN(startInstant.getTime())) {
      const durationMinutes =
        parseEventDurationMinutes(details.duration) ?? DEFAULT_EVENT_DURATION_MINUTES;
      timing = {
        kind: 'timed',
        start: startInstant,
        end: new Date(startInstant.getTime() + durationMinutes * 60_000),
      };
    }
  }

  const description = [
    source.client.phone?.trim() ? `Phone: ${source.client.phone.trim()}` : null,
    details.packageName ? `Package: ${details.packageName}` : null,
    source.backdropLink?.name?.trim() ? `Attendant: ${source.backdropLink.name.trim()}` : null,
    `Payment: ${source.paymentStatus?.trim() || 'Not recorded'}`,
    `Admin: ${adminUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return {
    uid: `${source.id}@${UID_DOMAIN}`,
    summary: details.packageName ? `${clientName} – ${details.packageName}` : clientName,
    location: details.location,
    description,
    url: adminUrl,
    timing,
    lastModified: source.updatedAt ?? null,
  };
}

export function buildCalendarFeed(sources: CalendarFeedSource[], now = new Date()): string {
  const events = sources
    .filter((source) => isIncludedInCalendarFeed(source, now))
    .map(toCalendarFeedEvent)
    .filter((event): event is IcsEvent => event !== null);

  return buildIcsCalendar(
    {
      prodId: '-//Photobooth Guys//Agreements Calendar Feed//EN',
      name: 'Photobooth Guys events',
      timeZone: TORONTO_TZ,
      events,
    },
    now,
  );
}
