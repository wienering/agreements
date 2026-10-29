/** Business timezone — Eastern Time (EST/EDT). America/Toronto matches America/New_York for calendar math. */
export const TORONTO_TZ = 'America/Toronto';
/** Alias for documentation; all event date calculations use Eastern Time. */
export const EASTERN_TZ = TORONTO_TZ;

const MS_PER_DAY = 86_400_000;
const INVALID_DATE_FALLBACK = '—';

function coerceDate(input: Date | string | number): Date {
  return input instanceof Date ? new Date(input.getTime()) : new Date(input);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export type TorontoDateParts = {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
};

/** YYYY-MM-DD in Toronto — for comparisons and grouping keys. */
export function torontoDateKey(date: Date | string | number): string {
  const d = coerceDate(date);
  if (!isValidDate(d)) {
    console.error('[dates] torontoDateKey: invalid date input', date);
    return '';
  }
  return d.toLocaleDateString('en-CA', { timeZone: TORONTO_TZ });
}

export function torontoTodayKey(): string {
  return torontoDateKey(new Date());
}

/** YYYY-MM month key in Toronto. */
export function torontoMonthKey(date: Date | string | number): string {
  const { year, month } = getTorontoDateParts(new Date(date));
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Effective event date for an agreement (event record, then legacy client field). */
export function resolveAgreementEventDate(agreement: {
  event?: { eventDate: Date | null } | null;
  client?: { eventDate: Date | null } | null;
}): Date | null {
  const raw = agreement.event?.eventDate ?? agreement.client?.eventDate ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Toronto calendar day + N days as a UTC instant at that day's midnight (Toronto). */
export function addTorontoCalendarDaysFrom(
  date: Date | string | number,
  days: number,
): Date {
  const { year, month, day } = getTorontoDateParts(new Date(date));
  const next = addTorontoCalendarDays(year, month, day, days);
  return torontoMidnightUtc(next.year, next.month, next.day);
}

/** UTC calendar date key (legacy server default on Vercel). */
export function utcDateKey(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

/**
 * Grouped price number. Preserves the call site's locale (`undefined` uses the runtime default).
 * Number formatting has no time zone.
 */
export function formatGroupedNumber(value: number, locale?: string): string {
  return locale === undefined ? value.toLocaleString() : value.toLocaleString(locale);
}

/** Display date in Toronto. Locale defaults to en-CA; the time zone is always America/Toronto. */
export function formatDateToronto(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-CA',
): string {
  const d = coerceDate(date);
  if (!isValidDate(d)) {
    console.error('[dates] formatDateToronto: invalid date input', date);
    return INVALID_DATE_FALLBACK;
  }
  return d.toLocaleDateString(locale, {
    ...options,
    timeZone: TORONTO_TZ,
  });
}

/** Display date+time in Toronto. */
export function formatDateTimeToronto(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'en-CA',
): string {
  const d = coerceDate(date);
  if (!isValidDate(d)) {
    console.error('[dates] formatDateTimeToronto: invalid date input', date);
    return INVALID_DATE_FALLBACK;
  }
  return d.toLocaleString(locale, {
    ...options,
    timeZone: TORONTO_TZ,
  });
}

/** Long-form event date label (Toronto calendar day). */
export function formatEventDateToronto(date: Date | string | number): string {
  return formatDateToronto(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const TORONTO_DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a bare YYYY-MM-DD string as a Toronto calendar date (no UTC midnight shift).
 * Returns null when the string is not a valid calendar date key.
 */
export function parseTorontoCalendarDateKey(dateKey: string): Date | null {
  const match = TORONTO_DATE_KEY_PATTERN.exec(dateKey.trim());
  if (!match) {
    return null;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }

  const instant = torontoMidnightUtc(year, month, day);
  const parts = getTorontoDateParts(instant);
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    return null;
  }

  return instant;
}

/**
 * Format an event date for display. Bare YYYY-MM-DD strings are treated as Toronto
 * calendar dates; Date values and other inputs use Toronto wall-clock formatting.
 */
export function formatEventDateTorontoInput(input: Date | string | number): string {
  if (typeof input === 'string') {
    const parsed = parseTorontoCalendarDateKey(input);
    if (parsed) {
      return formatEventDateToronto(parsed);
    }
  }

  return formatEventDateToronto(input);
}

/** Short event date label. */
export function formatEventDateTorontoShort(date: Date | string | number): string {
  return formatDateToronto(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Calendar-day difference in Toronto (later − earlier). */
export function torontoCalendarDaysBetween(
  earlier: Date | string | number,
  later: Date | string | number = new Date(),
): number {
  const a = new Date(`${torontoDateKey(earlier)}T12:00:00`);
  const b = new Date(`${torontoDateKey(later)}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function isTorontoDateAfter(
  date: Date | string | number,
  reference: Date | string | number = new Date(),
): boolean {
  return torontoDateKey(date) > torontoDateKey(reference);
}

export function torontoDaysUntil(date: Date | string | number, now = new Date()): number {
  const eventKey = torontoDateKey(date);
  const todayKey = torontoDateKey(now);
  if (eventKey <= todayKey) return 0;
  return torontoCalendarDaysBetween(now, date);
}

/** Toronto calendar components for a UTC instant. */
export function getTorontoDateParts(date: Date): TorontoDateParts {
  if (!isValidDate(date)) {
    console.error('[dates] getTorontoDateParts: invalid date input', date);
    return getTorontoDateParts(new Date());
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
  const weekday = parts.find((p) => p.type === 'weekday')!.value;

  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return { year, month, day, dayOfWeek: weekdayMap[weekday] ?? 0 };
}

/**
 * UTC instant for midnight at the start of a Toronto calendar day.
 * Used for DB range queries aligned to Toronto boundaries.
 */
export function torontoMidnightUtc(year: number, month: number, day: number): Date {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;

  let candidate = new Date(Date.UTC(year, month, day, 5, 0, 0));
  let candidateParts = getTorontoDateParts(candidate);
  let attempts = 0;

  while (
    (candidateParts.year !== year ||
      candidateParts.month !== month ||
      candidateParts.day !== day) &&
    attempts < 10
  ) {
    const dayDiff =
      (candidateParts.year - year) * 365 +
      (candidateParts.month - month) * 30 +
      (candidateParts.day - day);
    candidate = new Date(candidate.getTime() - dayDiff * MS_PER_DAY);
    candidateParts = getTorontoDateParts(candidate);
    attempts++;
  }

  const hourInToronto = parseInt(
    candidate.toLocaleString('en-US', { timeZone: TORONTO_TZ, hour: 'numeric', hour12: false }),
    10,
  );
  const minuteInToronto = parseInt(
    candidate.toLocaleString('en-US', { timeZone: TORONTO_TZ, minute: 'numeric' }),
    10,
  );
  const secondsInToronto = parseInt(
    candidate.toLocaleString('en-US', { timeZone: TORONTO_TZ, second: 'numeric' }),
    10,
  );

  const totalSeconds = hourInToronto * 3600 + minuteInToronto * 60 + secondsInToronto;
  return new Date(candidate.getTime() - totalSeconds * 1000);
}

/** Start/end of a Toronto calendar day as UTC instants (end is exclusive next midnight). */
export function torontoDayBoundsUtc(date: Date | string | number): { start: Date; end: Date } {
  const { year, month, day } = getTorontoDateParts(new Date(date));
  const start = torontoMidnightUtc(year, month, day);
  const nextDay = addTorontoCalendarDays(year, month, day, 1);
  const end = torontoMidnightUtc(nextDay.year, nextDay.month, nextDay.day);
  return { start, end };
}

export function addTorontoCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const anchor = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00`);
  anchor.setDate(anchor.getDate() + days);
  return {
    year: anchor.getFullYear(),
    month: anchor.getMonth(),
    day: anchor.getDate(),
  };
}

/** Start of today in Toronto as UTC instant. */
export function torontoStartOfTodayUtc(now = new Date()): Date {
  const { year, month, day } = getTorontoDateParts(now);
  return torontoMidnightUtc(year, month, day);
}

/**
 * Instant as America/Toronto local time with numeric offset, e.g. 2026-11-23T08:30:00-05:00.
 * Returns null for null/undefined/invalid input.
 */
export function formatTorontoOffsetIso(
  input: Date | string | number | null | undefined,
): string | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  const d = coerceDate(input);
  if (!isValidDate(d)) {
    console.error('[dates] formatTorontoOffsetIso: invalid date input', input);
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  let hour = get('hour');
  if (hour === '24') hour = '00';

  const rawOffset = get('timeZoneName'); // e.g. "GMT-05:00" or "GMT-5"
  const match = rawOffset.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  const offset = match
    ? `${match[1]}${match[2].padStart(2, '0')}:${(match[3] || '00').padStart(2, '0')}`
    : '-00:00';

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}${offset}`;
}

/** datetime-local input value (YYYY-MM-DDTHH:mm) representing Toronto wall clock. */
export function toTorontoDateTimeLocalInput(date: Date | string | number): string {
  const d = coerceDate(date);
  if (!isValidDate(d)) {
    console.error('[dates] toTorontoDateTimeLocalInput: invalid date input', date);
    return '';
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;

  const hour = get('hour') === '24' ? '00' : get('hour');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Parse datetime-local as Toronto wall clock → UTC instant for storage. */
export function fromTorontoDateTimeLocalInput(value: string): Date {
  if (!value?.includes('T')) {
    console.error('[dates] fromTorontoDateTimeLocalInput: invalid value', value);
    return new Date(NaN);
  }

  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if (![year, month, day, hour, minute].every((n) => Number.isFinite(n))) {
    console.error('[dates] fromTorontoDateTimeLocalInput: could not parse components', value);
    return new Date(NaN);
  }

  let candidate = new Date(Date.UTC(year, month - 1, day, hour + 5, minute));

  for (let attempts = 0; attempts < 12; attempts++) {
    if (!isValidDate(candidate)) {
      console.error('[dates] fromTorontoDateTimeLocalInput: iteration produced invalid date', value);
      return new Date(NaN);
    }

    const p = getTorontoDateParts(candidate);
    const h = parseInt(
      candidate.toLocaleString('en-US', { timeZone: TORONTO_TZ, hour: 'numeric', hour12: false }),
      10,
    );
    const m = parseInt(
      candidate.toLocaleString('en-US', { timeZone: TORONTO_TZ, minute: 'numeric' }),
      10,
    );

    if (p.year === year && p.month === month - 1 && p.day === day && h === hour && m === minute) {
      return candidate;
    }

    const targetMs = Date.UTC(year, month - 1, day, hour, minute);
    const actualMs = Date.UTC(p.year, p.month, p.day, h, m);
    candidate = new Date(candidate.getTime() + (targetMs - actualMs));
  }

  if (!isValidDate(candidate)) {
    console.error('[dates] fromTorontoDateTimeLocalInput: failed to converge', value);
  }

  return candidate;
}

/**
 * Normalize a parsed event date to noon UTC on its calendar day
 * (matches quote webhook convention for stable display in Toronto).
 */
export function normalizeEventDateToNoonUtc(date: Date): Date {
  if (Number.isNaN(date.getTime())) return date;
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0),
  );
}

/** True when a signed agreement snapshot likely has UTC off-by-one agreement.date. */
export function isLikelyUtcOffByOneSnapshot(signedAt: Date): boolean {
  return utcDateKey(signedAt) !== torontoDateKey(signedAt);
}

/** Sunday of the week containing `date` in Toronto. */
export function getTorontoWeekStart(date: Date): { date: Date; year: number; month: number; day: number } {
  const parts = getTorontoDateParts(date);
  const sundayDay = parts.day - parts.dayOfWeek;
  let year = parts.year;
  let month = parts.month;
  let day = sundayDay;

  if (day < 1) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    const daysInPrevMonth = new Date(year, month + 1, 0).getDate();
    day = daysInPrevMonth + day;
  }

  return {
    date: torontoMidnightUtc(year, month, day),
    year,
    month,
    day,
  };
}

export function formatTorontoWeekLabel(weekStartYear: number, weekStartMonth: number, weekStartDay: number): string {
  const end = addTorontoCalendarDays(weekStartYear, weekStartMonth, weekStartDay, 6);
  const startMonth = formatDateToronto(
    new Date(Date.UTC(weekStartYear, weekStartMonth, weekStartDay, 12, 0, 0)),
    { month: 'short' },
  );
  const endMonth = formatDateToronto(
    new Date(Date.UTC(end.year, end.month, end.day, 12, 0, 0)),
    { month: 'short' },
  );

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStartDay}-${end.day}`;
  }
  return `${startMonth} ${weekStartDay} - ${endMonth} ${end.day}`;
}
