import type { ExistingCalendarEvent } from '@/lib/googleCalendar/client';

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Which existing calendar entry belongs to this client's booking: not made by the CRM, not
 * cancelled, and titled with the client's name (how Bookly titles them) or listing their email.
 * Only an unambiguous single match is taken over; otherwise null.
 */
export function pickEntryToAdopt(
  entries: ExistingCalendarEvent[],
  client: { firstName: string; lastName: string; email: string },
): string | null {
  const name = normalize(`${client.firstName} ${client.lastName}`);
  const email = normalize(client.email);
  const matches = entries.filter((entry) => {
    if (entry.status === 'cancelled') return false;
    if (entry.extendedProperties?.private?.crmEventId) return false;
    const summary = normalize(entry.summary ?? '');
    const description = normalize(entry.description ?? '');
    return (name.length > 0 && summary.startsWith(name)) || (email.length > 0 && description.includes(email));
  });
  return matches.length === 1 ? matches[0].id : null;
}
