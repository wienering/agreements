/** Helpers for leads arriving from WF1 (WPForms → n8n). Pure, so they're tested on their own. */

/**
 * Event dates are typed freely on the forms ("May 29, 2027", "Friday, November 27th, 2026",
 * "Thursday August 13th"). Returns the date at noon UTC (shows as the same day in Toronto), or
 * null when there's no year or it can't be read, so a guess never lands on the wrong year.
 */
export function parseLooseEventDate(raw: string | null | undefined): Date | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return noonUtc(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const cleaned = value
    .replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+/i, '')
    .replace(/(\d+)(st|nd|rd|th)\b/gi, '$1')
    .replace(/\s+/g, ' ');
  if (!/\b\d{4}\b/.test(cleaned)) return null;

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  return noonUtc(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function noonUtc(year: number, month: number, day: number): Date | null {
  const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** WF1 tells the two forms apart by the page they were on: the quote tool page, or the booking form. */
export function leadSourceFromPage(pageUrl: string | null | undefined): 'QUOTE' | 'BOOKING_FORM' {
  return /photobooth-quotes/i.test(pageUrl ?? '') ? 'QUOTE' : 'BOOKING_FORM';
}

/** "4", "4 hours", "3.5" → whole hours, or null. */
export function parseHours(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : null;
  const match = /\d+(\.\d+)?/.exec(raw ?? '');
  return match ? Math.round(Number(match[0])) : null;
}

/** Split "Jane van Doe" when the form only gave a full name. */
export function splitName(first?: string | null, last?: string | null, full?: string | null) {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (f || l) return { firstName: f || l, lastName: f ? l : '' };
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}
