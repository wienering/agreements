import { parseEventDurationMinutes, parseEventStartTime } from '@/lib/calendarFeed';
import { formatTorontoOffsetIso, torontoDateKey } from '@/lib/dates';

/** True timestamps (signedAt, expiresAt, createdAt, conflict bounds) as America/Toronto with offset. */
export function mcpDateTime(value: Date | string | number | null | undefined): string | null {
  return formatTorontoOffsetIso(value);
}

/** Event calendar day only (YYYY-MM-DD in America/Toronto). Time lives in startTime. */
export function mcpCalendarDate(value: Date | string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const key = torontoDateKey(value);
  return key || null;
}

/**
 * Clock end time ("h:mm am/pm") from free-text startTime + duration, e.g. "8:30 pm" + "4 hours" -> "12:30 am".
 * Null when either value cannot be parsed.
 */
export function mcpEndTime(
  startTime: string | null | undefined,
  duration: string | null | undefined,
): string | null {
  const start = parseEventStartTime(startTime);
  const minutes = parseEventDurationMinutes(duration);
  if (!start || minutes === null) return null;
  const total = (start.hour * 60 + start.minute + minutes) % (24 * 60);
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour24 < 12 ? 'am' : 'pm'}`;
}

/** Decimal package price as a plain number, or null. */
export function mcpPrice(value: { toString(): string } | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}
