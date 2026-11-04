import { resolveEventSchedule, attendantNameOf } from '@/lib/calendarFeed';
import { formatDateToronto, TORONTO_TZ } from '@/lib/dates';
import { escapeHtml } from '@/lib/htmlEscape';
import { displayPaymentStatus } from '@/lib/paymentStatus';
import { adminEventUrl } from '@/lib/events/booking';

/** What the calendar entry is built from: one event with its client, attendant and agreements. */
export type CalendarSyncSource = {
  id: string;
  eventDate: Date | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
  packagePrice: { toString(): string } | number | null;
  eventPhone: string | null;
  notes: string | null;
  unlimitedPrints: boolean;
  paymentStatus: string;
  selectedBackdropName: string | null;
  client: { firstName: string; lastName: string; email: string; phone: string | null };
  backdropLink: { name: string; attendant?: { name: string } | null } | null;
  agreements: { status: string }[];
};

export type GoogleCalendarEventBody = {
  summary: string;
  location?: string;
  description: string;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  reminders: { useDefault: false; overrides: { method: 'popup'; minutes: number }[] };
  extendedProperties: { private: { crmEventId: string } };
  source: { title: string; url: string };
};

const REMINDER_MINUTES = 90;

const AGREEMENT_LABELS: Record<string, string> = {
  DRAFT: 'Draft (not sent)',
  SENT: 'Sent, not signed',
  SIGNED: 'Signed',
  COMPLETED: 'Signed',
};

function nextDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function priceText(price: CalendarSyncSource['packagePrice']): string | null {
  if (price == null) return null;
  const n = Number(price.toString());
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : null;
}

/**
 * The Google Calendar entry for an event, laid out like the Bookly entries: title is the client
 * and package; the description lists attendant, time, contact, venue, backdrop, extras, notes,
 * email and payment. Null when the event has no date.
 */
export function buildGoogleCalendarEvent(source: CalendarSyncSource): GoogleCalendarEventBody | null {
  const schedule = resolveEventSchedule({
    client: { eventDate: null, eventLocation: null, eventStartTime: null, eventDuration: null, eventPackage: null },
    event: source,
  });
  if (!schedule) return null;

  const clientName = `${source.client.firstName} ${source.client.lastName}`.trim();
  const packageName = source.eventPackage?.trim() || 'Photo Booth Rental';
  const attendant = attendantNameOf(source.backdropLink) ?? 'Not assigned';
  const time = [source.eventStartTime?.trim(), source.eventDuration?.trim()].filter(Boolean).join(' - ');
  const phone = source.eventPhone?.trim() || source.client.phone?.trim() || '';
  const statuses = source.agreements.map((a) => a.status);
  const agreementStatus = ['COMPLETED', 'SIGNED', 'SENT', 'DRAFT'].find((s) => statuses.includes(s));
  const e = (value: string) => escapeHtml(value);

  const lines = [
    `Attendant: ${e(attendant)}`,
    '',
    e(formatDateToronto(schedule.start ?? source.eventDate ?? new Date(), { month: 'long', day: 'numeric', year: 'numeric' }, 'en-US')),
    `Start Time: ${e(time || 'TBC')}`,
    `Client Name: ${e(clientName)}`,
    `Contact Phone: ${e(phone)}`,
    `Event Address: ${e(source.eventLocation?.trim() || '')}`,
    `Backdrop: ${e(source.selectedBackdropName?.trim() || 'To be selected')}`,
    'Additional Info:',
    ...(source.unlimitedPrints ? ['<b>Unlimited Prints</b>'] : []),
    '',
    `Internal Notes: ${source.notes?.trim() ? `<b>${e(source.notes.trim()).replace(/\n/g, '<br>')}</b>` : ''}`,
    '',
    `Email: ${e(source.client.email)}`,
    '',
    `Payment Status: ${e(displayPaymentStatus(source.paymentStatus) ?? '')}`,
    `Package Price: ${e(priceText(source.packagePrice) ?? '')}`,
    `Agreement: ${agreementStatus ? AGREEMENT_LABELS[agreementStatus] : 'None'}`,
    '',
    // Google shows a "Redirect Notice" when a link's text differs from its address, so the
    // address itself is the link text.
    `Open in CRM: <a href="${adminEventUrl(source.id)}">${adminEventUrl(source.id)}</a>`,
  ];

  const timed = schedule.start && schedule.end;
  return {
    summary: `${clientName} ${packageName}`.trim(),
    ...(source.eventLocation?.trim() ? { location: source.eventLocation.trim() } : {}),
    description: lines.join('<br>'),
    start: timed
      ? { dateTime: (schedule.start as Date).toISOString(), timeZone: TORONTO_TZ }
      : { date: schedule.dateKey },
    end: timed ? { dateTime: (schedule.end as Date).toISOString(), timeZone: TORONTO_TZ } : { date: nextDay(schedule.dateKey) },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: REMINDER_MINUTES }] },
    extendedProperties: { private: { crmEventId: source.id } },
    source: { title: 'Open in CRM', url: adminEventUrl(source.id) },
  };
}
