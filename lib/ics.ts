/**
 * Minimal iCalendar (RFC 5545) writer for read-only subscription feeds.
 * Times are written in UTC, so no VTIMEZONE block is needed.
 */

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;

export type IcsTiming =
  | { kind: 'timed'; start: Date; end: Date }
  /** Inclusive start day and exclusive end day, both YYYY-MM-DD. */
  | { kind: 'allDay'; startDateKey: string; endDateKey: string };

export type IcsEvent = {
  uid: string;
  summary: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  timing: IcsTiming;
  lastModified?: Date | null;
};

export type IcsCalendar = {
  prodId: string;
  name: string;
  timeZone?: string;
  events: IcsEvent[];
};

/** Escape a TEXT value: backslash, semicolon, comma and newlines (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Fold a content line so no physical line exceeds 75 octets (RFC 5545 §3.1).
 * Continuation lines start with a single space. Multi-byte UTF-8 characters are never split.
 */
export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= MAX_LINE_OCTETS) {
    return line;
  }

  const segments: string[] = [];
  let current = '';
  let currentOctets = 0;
  // The first line may hold 75 octets; continuation lines lose one octet to the leading space.
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const charOctets = Buffer.byteLength(char, 'utf8');
    if (currentOctets + charOctets > limit) {
      segments.push(current);
      current = '';
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1;
    }
    current += char;
    currentOctets += charOctets;
  }
  segments.push(current);

  return segments.join(`${CRLF} `);
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** UTC DATE-TIME form, e.g. 20261002T160000Z. */
export function formatIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** DATE form from a YYYY-MM-DD key, e.g. 20261002. */
export function formatIcsDate(dateKey: string): string {
  return dateKey.replace(/-/g, '');
}

function textProperty(name: string, value: string | null | undefined): string[] {
  const trimmed = value?.trim();
  return trimmed ? [`${name}:${escapeIcsText(trimmed)}`] : [];
}

function eventLines(event: IcsEvent, stamp: Date): string[] {
  const timing =
    event.timing.kind === 'timed'
      ? [
          `DTSTART:${formatIcsUtc(event.timing.start)}`,
          `DTEND:${formatIcsUtc(event.timing.end)}`,
        ]
      : [
          `DTSTART;VALUE=DATE:${formatIcsDate(event.timing.startDateKey)}`,
          `DTEND;VALUE=DATE:${formatIcsDate(event.timing.endDateKey)}`,
        ];

  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsUtc(stamp)}`,
    ...(event.lastModified ? [`LAST-MODIFIED:${formatIcsUtc(event.lastModified)}`] : []),
    ...timing,
    ...textProperty('SUMMARY', event.summary),
    ...textProperty('LOCATION', event.location),
    ...textProperty('DESCRIPTION', event.description),
    ...(event.url ? [`URL:${event.url}`] : []),
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ];
}

/** Serialize a calendar with CRLF line endings and folded lines. */
export function buildIcsCalendar(calendar: IcsCalendar, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${calendar.prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...textProperty('X-WR-CALNAME', calendar.name),
    ...textProperty('X-WR-TIMEZONE', calendar.timeZone),
    ...calendar.events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ];

  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
