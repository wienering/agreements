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
