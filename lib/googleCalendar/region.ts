import type { CalendarKey } from '@/lib/googleCalendar/client';

const ALBERTA = /(\bAB\b|\bAlberta\b|\bCalgary\b|\bEdmonton\b|\bBanff\b|\bCanmore\b|\bAirdrie\b|\bCochrane\b|\bOkotoks\b|\bRed Deer\b|\bLethbridge\b|\bChestermere\b|\bSt\.? Albert\b|\bSherwood Park\b)/i;

/** Alberta when the venue address says so (province or a main Alberta city). */
export function isAlbertaLocation(location: string | null | undefined): boolean {
  return Boolean(location && ALBERTA.test(location));
}

/**
 * The stored id carries which calendar the entry is on: "alberta:<id>" for the Alberta calendar,
 * a bare id for the main one (entries made before the Alberta calendar existed).
 */
export function parseStoredCalendarId(stored: string): { key: CalendarKey; id: string } {
  return stored.startsWith('alberta:') ? { key: 'alberta', id: stored.slice('alberta:'.length) } : { key: 'main', id: stored };
}

export function storeCalendarId(key: CalendarKey, id: string): string {
  return key === 'alberta' ? `alberta:${id}` : id;
}
