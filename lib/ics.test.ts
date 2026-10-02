import { describe, expect, it } from 'vitest';
import { buildIcsCalendar, escapeIcsText, foldIcsLine, formatIcsUtc } from '@/lib/ics';

function octets(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function unfold(value: string): string {
  return value.replace(/\r\n /g, '');
}

describe('escapeIcsText', () => {
  it('escapes backslashes, semicolons, commas and newlines', () => {
    expect(escapeIcsText('a\\b;c,d')).toBe('a\\\\b\\;c\\,d');
    expect(escapeIcsText('line 1\nline 2\r\nline 3')).toBe('line 1\\nline 2\\nline 3');
  });

  it('escapes backslashes before adding new ones', () => {
    expect(escapeIcsText('\\,')).toBe('\\\\\\,');
  });

  it('leaves colons and plain text alone', () => {
    expect(escapeIcsText('Hall: Room 2')).toBe('Hall: Room 2');
  });
});

describe('foldIcsLine', () => {
  it('leaves lines of 75 octets or fewer unchanged', () => {
    const line = `SUMMARY:${'x'.repeat(67)}`;
    expect(octets(line)).toBe(75);
    expect(foldIcsLine(line)).toBe(line);
  });

  it('folds long lines with CRLF plus a space, each physical line at most 75 octets', () => {
    const line = `DESCRIPTION:${'abcdefghij'.repeat(30)}`;
    const folded = foldIcsLine(line);
    const physical = folded.split('\r\n');

    expect(physical.length).toBeGreaterThan(1);
    physical.forEach((part, index) => {
      expect(octets(part)).toBeLessThanOrEqual(75);
      if (index > 0) expect(part.startsWith(' ')).toBe(true);
    });
    expect(octets(physical[0])).toBe(75);
    expect(unfold(folded)).toBe(line);
  });

  it('never splits a multi-byte character', () => {
    const line = `SUMMARY:${'é–'.repeat(40)}`;
    const folded = foldIcsLine(line);

    folded.split('\r\n').forEach((part) => {
      expect(octets(part)).toBeLessThanOrEqual(75);
      expect(part).not.toContain('�');
    });
    expect(unfold(folded)).toBe(line);
  });
});

describe('buildIcsCalendar', () => {
  const now = new Date('2026-10-02T16:00:00.000Z');
  const output = buildIcsCalendar(
    {
      prodId: '-//Test//Feed//EN',
      name: 'Events',
      events: [
        {
          uid: 'a1@example.com',
          summary: 'Jane Smith – 3 hr Photo Booth',
          location: 'Hall, Room 2; Toronto',
          description: 'Phone: 555\nPackage: Deluxe',
          timing: {
            kind: 'timed',
            start: new Date('2026-10-10T22:00:00.000Z'),
            end: new Date('2026-10-11T01:00:00.000Z'),
          },
        },
        {
          uid: 'b2@example.com',
          summary: 'All day',
          timing: { kind: 'allDay', startDateKey: '2026-10-12', endDateKey: '2026-10-13' },
        },
      ],
    },
    now,
  );

  it('uses CRLF line endings throughout', () => {
    expect(output.endsWith('\r\n')).toBe(true);
    expect(output.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('writes the calendar envelope and both events', () => {
    const lines = unfold(output).split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('END:VCALENDAR');
    expect(lines.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(lines).toContain(`DTSTAMP:${formatIcsUtc(now)}`);
  });

  it('writes timed events in UTC and all-day events as dates', () => {
    const lines = unfold(output).split('\r\n');
    expect(lines).toContain('DTSTART:20261010T220000Z');
    expect(lines).toContain('DTEND:20261011T010000Z');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261012');
    expect(lines).toContain('DTEND;VALUE=DATE:20261013');
  });

  it('escapes text properties', () => {
    const lines = unfold(output).split('\r\n');
    expect(lines).toContain('LOCATION:Hall\\, Room 2\\; Toronto');
    expect(lines).toContain('DESCRIPTION:Phone: 555\\nPackage: Deluxe');
  });
});
