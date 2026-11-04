'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { UIcon } from '@/app/components/UIcon';
import { eventTitle, type PortalEventSummary } from '@/app/components/portal/PortalEventsList';
import { formatEventDateToronto } from '@/lib/dates';
import { PrintTemplatesWidget } from '@/app/components/portal/PrintTemplatesWidget';

type Backdrop = { id: string; name: string; description: string | null; thumbnailUrl: string | null };

function useToken() {
  const router = useRouter();
  return useCallback(() => {
    const token = localStorage.getItem('portal_session_token');
    if (!token) router.push('/portal/login');
    return token;
  }, [router]);
}

export default function PortalEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();
  const getToken = useToken();
  const [event, setEvent] = useState<PortalEventSummary | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`/api/agreements/portal/events/${encodeURIComponent(eventId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      localStorage.removeItem('portal_session_token');
      router.push('/portal/login');
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || 'This event could not be loaded.');
      return;
    }
    setEvent(data.event);
  }, [eventId, getToken, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (event) document.title = `${eventTitle(event)} | Client Portal`;
  }, [event]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <BackLink />
        <div className="mt-6 rounded-lg border border-alert bg-panel p-6 text-alert">{error}</div>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const details: Array<[string, string | null]> = [
    ['Date', event.eventDate ? formatEventDateToronto(event.eventDate) : 'To be confirmed'],
    ['Start time', event.eventStartTime],
    ['Length', event.eventDuration],
    ['Venue', event.eventLocation],
    ['Package', event.eventPackage],
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <BackLink />
      <header className="mb-8 mt-4">
        <h1 className="client-page-title m-0 text-3xl font-bold text-ink">{eventTitle(event)}</h1>
        <div className="client-title-rule" aria-hidden="true" />
        {event.status === 'COMPLETED' && <p className="mt-3 text-muted">This event has wrapped up. Thank you for having us!</p>}
      </header>

      <section className="mb-6 rounded-lg border border-hairline bg-panel p-6">
        <h2 className="m-0 mb-4 text-lg font-semibold text-ink">Event details</h2>
        <dl className="m-0 grid gap-4 sm:grid-cols-2">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
                <dd className="m-0 mt-1 text-ink">{value}</dd>
              </div>
            ))}
        </dl>
      </section>

      {(event.paymentStatus || event.stripePaymentLink || event.stripeReceiptLink) && (
        <section className="mb-6 rounded-lg border border-hairline bg-panel p-6">
          <h2 className="m-0 mb-3 text-lg font-semibold text-ink">Payment</h2>
          {event.paymentStatus && (
            <span className="inline-flex rounded-full border border-hairline px-3 py-1 text-sm font-medium text-ink">{event.paymentStatus}</span>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {event.stripePaymentLink && event.paymentStatus !== 'Fully paid' && (
              <a href={event.stripePaymentLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-2 hover:text-accent">
                Make a payment →
              </a>
            )}
            {event.stripeReceiptLink && (
              <a href={event.stripeReceiptLink} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2 hover:text-accent">
                View receipt
              </a>
            )}
          </div>
        </section>
      )}

      {(event.backdrop.canChoose || event.backdrop.selectedName) && (
        <BackdropPicker
          eventId={event.id}
          canChoose={event.backdrop.canChoose}
          selectedName={event.backdrop.selectedName}
          onSaved={(name) => setEvent((prev) => (prev ? { ...prev, backdrop: { ...prev.backdrop, selectedName: name } } : prev))}
        />
      )}

      {event.status === 'UPCOMING' && (
        <section className="mb-6 rounded-lg border border-hairline bg-panel p-6">
          <h2 className="m-0 text-lg font-semibold text-ink">Print template</h2>
          <p className="m-0 mb-4 mt-1 text-sm text-muted">Pick the layout for your photo strips and make it your own.</p>
          <PrintTemplatesWidget />
        </section>
      )}

      {event.galleryLinks.length > 0 && (
        <section className="mb-6 rounded-lg border border-hairline bg-panel p-6">
          <h2 className="m-0 mb-3 text-lg font-semibold text-ink">Your photos</h2>
          <div className="flex flex-wrap gap-3">
            {event.galleryLinks.map((gallery) => (
              <a
                key={gallery.url}
                href={gallery.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-on no-underline hover:opacity-90"
              >
                <UIcon name="camera" /> {gallery.title}
              </a>
            ))}
          </div>
        </section>
      )}

      {event.agreements.length > 0 && (
        <section className="mb-6 rounded-lg border border-hairline bg-panel p-6">
          <h2 className="m-0 mb-3 text-lg font-semibold text-ink">Agreement</h2>
          <ul className="m-0 list-none p-0">
            {event.agreements.map((agreement) => (
              <li key={agreement.id} className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-ink">{agreement.title}</span>
                <Link
                  href={`/portal/agreement/${agreement.id}`}
                  className={`rounded-md px-4 py-2 text-sm font-semibold no-underline ${
                    agreement.canSign ? 'bg-accent text-accent-on hover:opacity-90' : 'border border-hairline text-ink hover:border-accent'
                  }`}
                >
                  {agreement.canSign ? 'Review and sign' : agreement.isSigned ? 'View signed agreement' : 'View'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/portal/dashboard" className="text-sm text-muted no-underline hover:text-accent">
      ← All your events
    </Link>
  );
}

/** The attendant's backdrops as a picture grid, right here in the portal. */
function BackdropPicker({
  eventId,
  canChoose,
  selectedName,
  onSaved,
}: {
  eventId: string;
  canChoose: boolean;
  selectedName: string | null;
  onSaved: (name: string) => void;
}) {
  const [backdrops, setBackdrops] = useState<Backdrop[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [open, setOpen] = useState(!selectedName);

  useEffect(() => {
    if (!canChoose || !open || backdrops) return;
    const token = localStorage.getItem('portal_session_token');
    fetch(`/api/agreements/portal/events/${encodeURIComponent(eventId)}/backdrop`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Backdrops are unavailable right now.');
        setBackdrops(data.backdrops || []);
      })
      .catch((err: Error) => setError(err.message));
  }, [canChoose, open, backdrops, eventId]);

  const choose = async (name: string) => {
    setSaving(name);
    setError('');
    try {
      const token = localStorage.getItem('portal_session_token');
      const response = await fetch(`/api/agreements/portal/events/${encodeURIComponent(eventId)}/backdrop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ backdropName: name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save your backdrop.');
      onSaved(name);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your backdrop.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-hairline bg-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ink">Backdrop</h2>
          <p className="m-0 mt-1 text-sm text-muted">
            {selectedName ? (
              <>
                You chose <span className="font-semibold text-ink">{selectedName}</span>.
              </>
            ) : (
              'Pick the backdrop you would like at your event.'
            )}
          </p>
        </div>
        {selectedName && canChoose && !open && (
          <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:border-accent">
            Change backdrop
          </button>
        )}
      </div>

      {open && canChoose && (
        <div className="mt-5">
          {error && <p className="mb-3 text-sm text-alert">{error}</p>}
          {!backdrops && !error && <p className="text-sm text-muted">Loading backdrops...</p>}
          {backdrops && backdrops.length === 0 && <p className="text-sm text-muted">No backdrops are listed yet. We will be in touch.</p>}
          {backdrops && backdrops.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {backdrops.map((backdrop) => {
                const isSelected = backdrop.name === selectedName;
                return (
                  <button
                    key={backdrop.id}
                    type="button"
                    disabled={saving !== null}
                    onClick={() => choose(backdrop.name)}
                    className={`group overflow-hidden rounded-lg border bg-paper p-0 text-left transition-all ${
                      isSelected ? 'border-accent ring-2 ring-accent' : 'border-hairline hover:border-accent'
                    } ${saving !== null ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-hairline">
                      {backdrop.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={backdrop.thumbnailUrl}
                          alt={backdrop.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted">
                          <UIcon name="picture" className="text-3xl" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <span className="text-sm font-semibold text-ink">{backdrop.name}</span>
                      {saving === backdrop.name ? (
                        <span className="text-xs text-muted">Saving…</span>
                      ) : isSelected ? (
                        <UIcon name="check" className="text-accent" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
