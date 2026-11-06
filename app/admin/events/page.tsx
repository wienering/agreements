'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { adminFetch } from '@/lib/adminFetch';
import {
  formatEventDateTorontoShort,
  fromTorontoDateTimeLocalInput,
  toTorontoDateTimeLocalInput,
  torontoTodayKey,
} from '@/lib/dates';
import {
  agreementLabel,
  attendantOptions,
  filterEvents,
  NO_ATTENDANT,
  liveAgreements,
  type EventListItem,
  type EventView,
} from '@/lib/events/list';
import { isUnsentDraft } from '@/lib/agreements/visibility';
import { AdminButton, AdminLink } from '../../components/AdminButton';
import SearchableSelect from '../../components/SearchableSelect';
import { StatusBadge, type StatusBadgeVariant } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { CreateAgreementModal } from '../agreements/_components/CreateAgreementModal';
import { ModalFrame } from '../agreements/_components/ModalFrame';
import type { Agreement, BackdropLinkOption, ClientOption, TemplateOption } from '../agreements/_components/types';
import { EventDrawer, type EventDetail } from './_components/EventDrawer';
import { displayPaymentStatus } from '@/lib/paymentStatus';
import { fieldClass, smallLabelClass } from '../agreements/_components/uiClasses';

type EventForm = {
  clientId: string;
  eventDate: string;
  eventType: string;
  eventName: string;
  eventLocation: string;
  eventStartTime: string;
  eventDuration: string;
  eventPackage: string;
  packagePrice: string;
  eventPhone: string;
  notes: string;
  internalNotes: string;
  unlimitedPrints: boolean;
};

const emptyForm: EventForm = {
  clientId: '',
  eventDate: '',
  eventType: '',
  eventName: '',
  eventLocation: '',
  eventStartTime: '',
  eventDuration: '',
  eventPackage: '',
  packagePrice: '',
  eventPhone: '',
  notes: '',
  internalNotes: '',
  unlimitedPrints: false,
};

const VIEWS: Array<{ value: EventView; label: string }> = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'no-agreement', label: 'No agreement' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

function formFromEvent(event: EventListItem): EventForm {
  return {
    clientId: event.clientId,
    eventDate: event.eventDate ? toTorontoDateTimeLocalInput(event.eventDate) : '',
    eventType: event.eventType ?? '',
    eventName: event.eventName ?? '',
    eventLocation: event.eventLocation ?? '',
    eventStartTime: event.eventStartTime ?? '',
    eventDuration: event.eventDuration ?? '',
    eventPackage: event.eventPackage ?? '',
    packagePrice: event.packagePrice != null ? String(event.packagePrice) : '',
    eventPhone: event.eventPhone ?? '',
    notes: event.notes ?? '',
    internalNotes: event.internalNotes ?? '',
    unlimitedPrints: event.unlimitedPrints ?? false,
  };
}

function badgeVariant(status: string, unsent: boolean): StatusBadgeVariant {
  if (unsent) return 'warning';
  if (status === 'SIGNED' || status === 'COMPLETED' || status === 'SENT') return 'accent';
  if (status === 'CANCELLED') return 'danger';
  return 'neutral';
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  const detail = Array.isArray(data.details) && data.details[0]?.message;
  return detail || data.error || fallback;
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-admin-bg" />}>
      <EventsAdminPage />
    </Suspense>
  );
}

function EventsAdminPage() {
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openEventId = searchParams.get('event');
  const [backdropLinks, setBackdropLinks] = useState<BackdropLinkOption[]>([]);
  const openEvent = useCallback(
    (id: string | null) => router.replace(id ? `${pathname}?event=${encodeURIComponent(id)}` : pathname, { scroll: false }),
    [router, pathname],
  );
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [view, setView] = useState<EventView>('upcoming');
  const [search, setSearch] = useState('');
  const [attendant, setAttendant] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventListItem | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [agreementFor, setAgreementFor] = useState<{ id: string; clientId: string } | null>(null);

  useEffect(() => {
    document.title = 'Events | CRM | Photobooth Guys';
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || !searchInputRef.current) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      e.preventDefault();
      searchInputRef.current.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadEvents = async () => {
    try {
      const response = await adminFetch('/api/events');
      if (response.ok) setEvents(await response.json());
      else showToast(await errorMessage(response, 'Could not load events'), 'error');
    } catch (error) {
      console.error('Error loading events:', error);
      showToast('Could not load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    adminFetch('/api/clients')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: ClientOption[]) => setClients(Array.isArray(data) ? data : []))
      .catch((error) => console.error('Error loading clients:', error));
    adminFetch('/api/agreements/backdrop-links')
      .then((response) => (response.ok ? response.json() : {}))
      .then((data: { backdropLinks?: BackdropLinkOption[] }) => setBackdropLinks(data.backdropLinks || []))
      .catch((error) => console.error('Error loading attendants:', error));
    adminFetch('/api/templates')
      .then((response) => (response.ok ? response.json() : []))
      .then((data: TemplateOption[]) => setTemplates(Array.isArray(data) ? data : []))
      .catch((error) => console.error('Error loading templates:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayKey = torontoTodayKey();
  const visible = useMemo(
    () => filterEvents(events, view, search, todayKey, attendant),
    [events, view, search, todayKey, attendant],
  );
  const attendantNames = useMemo(() => attendantOptions(events), [events]);
  const noAgreementCount = useMemo(
    () => filterEvents(events, 'no-agreement', '', todayKey).length,
    [events, todayKey],
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (event: EventListItem) => {
    setEditing(event);
    setForm(formFromEvent(event));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (!editing && !form.clientId) {
      showToast('Pick a client first', 'error');
      return;
    }
    let eventDate: string | null = null;
    if (form.eventDate.trim()) {
      const parsed = fromTorontoDateTimeLocalInput(form.eventDate);
      if (Number.isNaN(parsed.getTime())) {
        showToast('Invalid event date, please re-select it', 'error');
        return;
      }
      eventDate = parsed.toISOString();
    }

    setSaving(true);
    try {
      const { clientId, ...fields } = form;
      const response = editing
        ? await adminFetch('/api/events/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...fields, id: editing.id, eventDate }),
          })
        : await adminFetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...fields, clientId, eventDate }),
          });
      if (!response.ok) {
        showToast(await errorMessage(response, 'Could not save the event'), 'error');
        return;
      }
      showToast(editing ? 'Event updated' : 'Event added');
      closeForm();
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      showToast('Could not save the event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onAgreementCreated = (agreement: Agreement) => {
    const forEventId = agreementFor?.id;
    setAgreementFor(null);
    showToast('Agreement created as a draft. Open it from the event to send it.');
    void agreement;
    loadEvents();
    if (forEventId) {
      // Reopen the drawer so it shows the new agreement.
      openEvent(null);
      window.setTimeout(() => openEvent(forEventId), 0);
    }
  };

  const editFromDrawer = (detail: EventDetail) => {
    const match = events.find((e) => e.id === detail.id);
    if (match) openEdit(match);
  };

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-admin-bg p-4 md:p-6">
      <ToastContainer />
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="admin-page-title m-0 text-2xl font-bold text-admin-text md:text-[32px]">Events</h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <p className="mb-0 mt-2 text-base text-admin-muted">
              Every booking, with or without an agreement.
            </p>
          </div>
          <AdminButton variant="primary" onClick={openNew} title="Add an event without an agreement">
            + New Event
          </AdminButton>
        </div>

        {/* Views on one row and search + attendant on the next until xl, so the search box
            keeps a usable width on tablets (iPad portrait/landscape) instead of being squeezed. */}
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Event views">
            {VIEWS.map((option) => (
              <AdminButton
                key={option.value}
                size="compact"
                variant={view === option.value ? 'primary' : 'ghost'}
                onClick={() => setView(option.value)}
                aria-pressed={view === option.value}
              >
                {option.label}
                {option.value === 'no-agreement' && noAgreementCount > 0 ? ` (${noAgreementCount})` : ''}
              </AdminButton>
            ))}
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search client, type, venue... (press /)"
              aria-label="Search events"
              className={`${fieldClass} min-w-0 sm:flex-1 xl:w-[320px] xl:flex-none`}
            />
            <select
              value={attendant}
              onChange={(event) => setAttendant(event.target.value)}
              aria-label="Filter by attendant"
              className={`${fieldClass} sm:w-[200px] sm:flex-none`}
            >
              <option value="">All attendants</option>
              {attendantNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={NO_ATTENDANT}>No attendant yet</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-admin-muted">Loading events...</p>
        ) : visible.length === 0 ? (
          <div className="rounded border border-admin-hairline bg-admin-surface p-6 text-admin-muted">
            No events here.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-admin-hairline bg-admin-surface">
            {visible.map((event, index) => {
              const live = liveAgreements(event);
              const details = [event.eventStartTime, event.eventDuration, event.eventPackage].filter(Boolean).join(' · ');
              return (
                <div
                  key={event.id}
                  className={`flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between ${
                    index === 0 ? '' : 'border-t border-admin-hairline'
                  }`}
                >
                  <div className="min-w-0 md:w-[150px] md:shrink-0">
                    <div className="text-sm font-semibold text-admin-text">
                      {event.eventDate ? formatEventDateTorontoShort(event.eventDate) : 'No date'}
                    </div>
                    {event.eventType && <div className="text-xs text-admin-muted">{event.eventType}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEvent(event.id)}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-left"
                  >
                    <div className="text-sm font-semibold text-admin-text">
                      {event.client.firstName} {event.client.lastName}
                      {event.eventName ? <span className="font-normal text-admin-muted"> · {event.eventName}</span> : null}
                    </div>
                    <div className="truncate text-xs text-admin-muted">
                      {[event.eventLocation, details].filter(Boolean).join(' · ') || 'No details yet'}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-admin-muted">
                      {event.status && event.status !== 'UPCOMING' && <span className="font-semibold">{event.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}</span>}
                      <span>Payment: {displayPaymentStatus(event.paymentStatus) ?? 'Not paid'}</span>
                      <span>Attendant: {event.backdropLink?.attendant?.name || event.backdropLink?.name || 'none'}</span>
                      {event.nextAction && <span>Next: {event.nextAction}</span>}
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {event.agreements.map((agreement) => {
                      const unsent = isUnsentDraft(agreement);
                      return (
                        <AdminLink
                          key={agreement.id}
                          size="compact"
                          href={`/admin/agreements?agreement=${encodeURIComponent(agreement.id)}`}
                          title={`Open ${agreement.template?.internalTitle || agreement.template?.title || 'agreement'}`}
                          style={{ gap: 6 }}
                        >
                          <StatusBadge variant={badgeVariant(agreement.status, unsent)}>{agreementLabel(agreement)}</StatusBadge>
                          Open
                        </AdminLink>
                      );
                    })}
                    {live.length === 0 && (
                      <AdminButton size="compact" variant="primary" onClick={() => setAgreementFor(event)}>
                        + Add agreement
                      </AdminButton>
                    )}
                    <AdminButton size="compact" variant="ghost" onClick={() => openEvent(event.id)}>
                      Manage
                    </AdminButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <ModalFrame onBackdropClick={closeForm} maxWidthClass="max-w-[640px]" labelledBy="event-form-title">
          {/* Sits above the event drawer when opened from it. */}
          <h2 id="event-form-title" className="m-0 mb-4 text-lg text-admin-text">
            {editing ? `Edit event · ${editing.client.firstName} ${editing.client.lastName}` : 'New event'}
          </h2>
          <form onSubmit={submit}>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {!editing && (
                <div className="md:col-span-2">
                  <label className={smallLabelClass}>Client</label>
                  <SearchableSelect
                    options={clients.map((client) => ({
                      id: client.id,
                      label: `${client.firstName} ${client.lastName} (${client.email})`,
                      value: client.id,
                    }))}
                    value={form.clientId}
                    onChange={(value) => set('clientId', value)}
                    placeholder="Search and select a client..."
                    required
                  />
                  <p className="mb-0 mt-1 text-xs text-admin-muted">
                    New client? Add them on the Clients page first.
                  </p>
                </div>
              )}
              <Field label="Event date">
                <input type="datetime-local" value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Event type">
                <input value={form.eventType} onChange={(e) => set('eventType', e.target.value)} placeholder="Wedding, Corporate..." className={fieldClass} />
              </Field>
              <Field label="Event name">
                <input value={form.eventName} onChange={(e) => set('eventName', e.target.value)} placeholder="Optional" className={fieldClass} />
              </Field>
              <Field label="Location">
                <input value={form.eventLocation} onChange={(e) => set('eventLocation', e.target.value)} placeholder="Venue" className={fieldClass} />
              </Field>
              <Field label="Start time">
                <input value={form.eventStartTime} onChange={(e) => set('eventStartTime', e.target.value)} placeholder="e.g. 7:00 PM" className={fieldClass} />
              </Field>
              <Field label="Duration">
                <input value={form.eventDuration} onChange={(e) => set('eventDuration', e.target.value)} placeholder="e.g. 4 hours" className={fieldClass} />
              </Field>
              <Field label="Package">
                <input value={form.eventPackage} onChange={(e) => set('eventPackage', e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Package price">
                <input type="number" step="0.01" min="0" value={form.packagePrice} onChange={(e) => set('packagePrice', e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Day-of phone">
                <input type="tel" value={form.eventPhone} onChange={(e) => set('eventPhone', e.target.value)} className={fieldClass} />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-admin-text">
                <input type="checkbox" checked={form.unlimitedPrints} onChange={(e) => set('unlimitedPrints', e.target.checked)} className="h-4 w-4" />
                Unlimited prints
              </label>
              <div className="md:col-span-2">
                <Field label="Additional info (attendants see this)">
                  <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={fieldClass} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Internal notes (only you see this)">
                  <textarea
                    rows={3}
                    value={form.internalNotes}
                    onChange={(e) => set('internalNotes', e.target.value)}
                    placeholder="Payments, balances, pricing, anything attendants shouldn't see"
                    className={fieldClass}
                  />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <AdminButton type="button" variant="ghost" onClick={closeForm}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save event' : 'Add event'}
              </AdminButton>
            </div>
          </form>
        </ModalFrame>
      )}

      {openEventId && (
        <EventDrawer
          key={openEventId}
          eventId={openEventId}
          backdropLinks={backdropLinks}
          onClose={() => openEvent(null)}
          onChanged={loadEvents}
          onAddAgreement={(detail) => setAgreementFor({ id: detail.id, clientId: detail.clientId })}
          onEditDetails={editFromDrawer}
          showToast={showToast}
        />
      )}

      {agreementFor && (
        <CreateAgreementModal
          open
          onClose={() => setAgreementFor(null)}
          clients={clients}
          templates={templates}
          initial={{ clientId: agreementFor.clientId, eventId: agreementFor.id, templateId: '' }}
          onCreated={onAgreementCreated}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={smallLabelClass}>{label}</label>
      {children}
    </div>
  );
}
