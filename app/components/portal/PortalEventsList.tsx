'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UIcon } from '@/app/components/UIcon';
import { formatEventDateToronto, torontoDateKey, torontoTodayKey } from '@/lib/dates';

export interface PortalEventSummary {
  id: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  eventDate: string | null;
  eventType: string | null;
  eventName: string | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
  paymentStatus: string | null;
  stripePaymentLink: string | null;
  stripeReceiptLink: string | null;
  galleryLinks: Array<{ title: string; url: string }>;
  backdrop: { canChoose: boolean; selectedName: string | null };
  agreements: Array<{ id: string; title: string; status: string; isSigned: boolean; canSign: boolean }>;
}

export function eventTitle(event: Pick<PortalEventSummary, 'eventName' | 'eventType'>): string {
  return event.eventName || event.eventType || 'Your event';
}

export function PortalEventsList() {
  const router = useRouter();
  const [events, setEvents] = useState<PortalEventSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('portal_session_token');
    if (!token) return;
    fetch('/api/agreements/portal/events', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) {
          localStorage.removeItem('portal_session_token');
          router.push('/portal/login');
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load your events');
        setEvents(data.events);
      })
      .catch((err: Error) => setError(err.message));
  }, [router]);

  if (error) {
    return <div className="mb-8 rounded-lg border border-alert bg-panel p-6 text-alert">{error}</div>;
  }
  if (!events) {
    return <div className="mb-8 rounded-lg border border-hairline bg-panel p-6 text-muted">Loading your events...</div>;
  }

  const today = torontoTodayKey();
  const upcoming = events.filter((e) => !e.eventDate || torontoDateKey(e.eventDate) >= today);
  const past = events.filter((e) => e.eventDate && torontoDateKey(e.eventDate) < today).reverse();

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-ink">{upcoming.length === 1 ? 'Your event' : 'Your events'}</h2>
      {upcoming.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-panel p-6 text-muted">You have no upcoming events with us.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
      {past.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Past events ({past.length})</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {past.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function EventCard({ event }: { event: PortalEventSummary }) {
  const needsBackdrop = event.backdrop.canChoose && !event.backdrop.selectedName;
  const unsigned = event.agreements.some((a) => a.canSign);
  return (
    <Link
      href={`/portal/event/${event.id}`}
      className="group block rounded-lg border border-hairline bg-panel p-5 no-underline transition-colors hover:border-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm text-muted">{event.eventDate ? formatEventDateToronto(event.eventDate) : 'Date to be confirmed'}</p>
          <h3 className="m-0 mt-1 text-lg font-semibold text-ink">{eventTitle(event)}</h3>
          {event.eventLocation && (
            <p className="m-0 mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
              <UIcon name="marker" className="text-sm" />
              {event.eventLocation}
            </p>
          )}
        </div>
        <span className="text-muted transition-colors group-hover:text-accent">→</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {event.paymentStatus && <span className="rounded-full border border-hairline px-2.5 py-1 text-ink">{event.paymentStatus}</span>}
        {needsBackdrop && <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-on">Choose your backdrop</span>}
        {event.backdrop.selectedName && (
          <span className="rounded-full border border-hairline px-2.5 py-1 text-ink">Backdrop: {event.backdrop.selectedName}</span>
        )}
        {unsigned && <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-on">Agreement to sign</span>}
        {event.galleryLinks.length > 0 && <span className="rounded-full border border-hairline px-2.5 py-1 text-ink">Photos ready</span>}
      </div>
    </Link>
  );
}
