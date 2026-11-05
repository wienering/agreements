import { torontoDateKey } from '@/lib/dates';
import { isUnsentDraft } from '@/lib/agreements/visibility';

export interface EventListAgreement {
  id: string;
  status: string;
  emailSendCount?: number | null;
  lastEmailedAt?: string | null;
  firstViewedAt?: string | null;
  paymentStatus?: string | null;
  template?: { title: string; internalTitle?: string | null } | null;
}

export interface EventListItem {
  id: string;
  clientId: string;
  eventDate?: string | null;
  eventType?: string | null;
  eventName?: string | null;
  eventLocation?: string | null;
  eventStartTime?: string | null;
  eventDuration?: string | null;
  eventPackage?: string | null;
  packagePrice?: string | number | null;
  eventPhone?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  unlimitedPrints?: boolean;
  createdAt?: string;
  status?: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  paymentStatus?: string | null;
  nextAction?: string | null;
  galleryEmailSentAt?: string | null;
  backdropLink?: { id: string; name: string; attendant?: { name: string } | null } | null;
  client: { id: string; firstName: string; lastName: string; email: string };
  agreements: EventListAgreement[];
}

export type EventView = 'upcoming' | 'past' | 'no-agreement' | 'all';

/** Attendant filter value for events with no attendant assigned. */
export const NO_ATTENDANT = '__none__';

/** Who's working the event: the attendant on its backdrop link, else the link's own name. */
export function eventAttendantName(event: EventListItem): string | null {
  return event.backdropLink?.attendant?.name?.trim() || event.backdropLink?.name?.trim() || null;
}

/** Attendant names that appear on these events, A to Z, for the filter dropdown. */
export function attendantOptions(events: EventListItem[]): string[] {
  const names = new Set<string>();
  for (const event of events) {
    const name = eventAttendantName(event);
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function matchesAttendant(event: EventListItem, attendant: string): boolean {
  if (!attendant) return true;
  const name = eventAttendantName(event);
  if (attendant === NO_ATTENDANT) return name === null;
  return name === attendant;
}

/** Toronto calendar day of the event, or '' when it has no date. */
function eventDayKey(event: EventListItem): string {
  return event.eventDate ? torontoDateKey(event.eventDate) : '';
}

function matchesSearch(event: EventListItem, term: string): boolean {
  const haystack = [
    event.client.firstName,
    event.client.lastName,
    `${event.client.firstName} ${event.client.lastName}`,
    event.client.email,
    event.eventType,
    event.eventName,
    event.eventLocation,
    event.eventPackage,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

/** Agreements on the event that aren't cancelled. */
export function liveAgreements(event: EventListItem): EventListAgreement[] {
  return event.agreements.filter((agreement) => agreement.status !== 'CANCELLED');
}

/**
 * Upcoming: today or later, plus undated events, not cancelled. Past: before today, newest first.
 * No agreement: upcoming or undated events with no live agreement. All: everything, cancelled too.
 * `attendant` narrows to one attendant's events ('' = everyone, NO_ATTENDANT = none assigned).
 */
export function filterEvents(
  events: EventListItem[],
  view: EventView,
  search: string,
  todayKey: string,
  attendant = '',
): EventListItem[] {
  const term = search.trim().toLowerCase();
  const filtered = events.filter((event) => {
    if (term && !matchesSearch(event, term)) return false;
    if (!matchesAttendant(event, attendant)) return false;
    const day = eventDayKey(event);
    const isPast = day !== '' && day < todayKey;
    const cancelled = event.status === 'CANCELLED';
    if (view === 'upcoming') return !isPast && !cancelled;
    if (view === 'past') return isPast;
    if (view === 'no-agreement') return !isPast && !cancelled && liveAgreements(event).length === 0;
    return true;
  });

  const direction = view === 'past' ? -1 : 1;
  return filtered.sort((a, b) => {
    const aDay = eventDayKey(a);
    const bDay = eventDayKey(b);
    // Undated events sort last either way.
    if (!aDay && !bDay) return 0;
    if (!aDay) return 1;
    if (!bDay) return -1;
    const byDate = new Date(a.eventDate as string).getTime() - new Date(b.eventDate as string).getTime();
    return byDate * direction;
  });
}

/** Short label for an agreement on the Events page. */
export function agreementLabel(agreement: EventListAgreement): string {
  if (isUnsentDraft(agreement)) return 'Draft, not sent';
  switch (agreement.status) {
    case 'DRAFT':
      return 'Draft, shared';
    case 'SENT':
      return 'Sent';
    case 'SIGNED':
      return 'Signed';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return agreement.status;
  }
}
