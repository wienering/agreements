'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { formatDateTimeToronto, formatEventDateToronto } from '@/lib/dates';
import { isDepositPaid, PAYMENT_STATUSES } from '@/lib/paymentStatus';
import { isUnsentDraft } from '@/lib/agreements/visibility';
import { agreementLabel } from '@/lib/events/list';
import { AdminButton, AdminLink } from '../../../components/AdminButton';
import { StatusBadge } from '../../../components/StatusBadge';
import { UIcon } from '../../../components/UIcon';
import { AttendantConflictWarning } from '../../agreements/_components/AttendantConflictWarning';
import { FollowUpsPanel } from '../../agreements/_components/FollowUpsPanel';
import { GalleryReadyPreviewModal } from '../../agreements/_components/GalleryReadyPreviewModal';
import { InvoiceModal } from '../../agreements/_components/InvoiceModal';
import { AttendantModal } from '../../agreements/_components/AttendantModal';
import { backdropLinkLabel, extractAttendantIdFromUrl } from '../../agreements/_components/agreementUtils';
import type { Agreement, BackdropLinkOption, InvoiceResult, InvoiceType } from '../../agreements/_components/types';
import { eyebrowClass, fieldClass, metaPanelClass, smallLabelClass } from '../../agreements/_components/uiClasses';

type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;

type GalleryLink = { title: string; url: string };

export interface EventDetail {
  id: string;
  clientId: string;
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  archived: boolean;
  eventDate: string | null;
  eventType: string | null;
  eventName: string | null;
  eventLocation: string | null;
  eventStartTime: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
  packagePrice: string | number | null;
  eventPhone: string | null;
  notes: string | null;
  paymentStatus: string;
  stripePaymentLink: string | null;
  stripeReceiptLink: string | null;
  galleryLinks: GalleryLink[] | null;
  galleryEmailSentAt: string | null;
  nextAction: string | null;
  backdropLinkId: string | null;
  selectedBackdropName: string | null;
  showPhoneNumberAlways: boolean;
  forceVirtualGreenScreen: boolean;
  cancellationReason: string | null;
  client: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  backdropLink: (BackdropLinkOption & { url: string }) | null;
  agreements: Array<{
    id: string;
    status: string;
    archived: boolean;
    emailSendCount: number;
    lastEmailedAt: string | null;
    firstViewedAt: string | null;
    signedAt: string | null;
    template: { title: string; internalTitle: string | null } | null;
  }>;
  activities: Array<{ id: string; type: string; createdAt: string; meta: unknown }>;
  clientNotes: Array<{ id: string; content: string; createdAt: string }>;
}

const STATUS_LABELS: Record<EventDetail['status'], string> = {
  UPCOMING: 'Upcoming',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  const detail = Array.isArray(data.details) && data.details[0]?.message;
  return detail || data.error || fallback;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-admin-hairline py-5">
      <h3 className={eyebrowClass}>{title}</h3>
      {children}
    </section>
  );
}

export function EventDrawer({
  eventId,
  backdropLinks,
  onClose,
  onChanged,
  onAddAgreement,
  onEditDetails,
  showToast,
}: {
  eventId: string;
  backdropLinks: BackdropLinkOption[];
  onClose: () => void;
  /** The list should refresh: something on the event changed. */
  onChanged: () => void;
  onAddAgreement: (event: EventDetail) => void;
  onEditDetails: (event: EventDetail) => void;
  showToast: ShowToast;
}) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState<GalleryLink[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [receiptLink, setReceiptLink] = useState('');
  const [backdropOptions, setBackdropOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [followupsVersion, setFollowupsVersion] = useState(0);
  const [preview, setPreview] = useState<React.ComponentProps<typeof GalleryReadyPreviewModal>['preview']>(null);
  const [sendingGallery, setSendingGallery] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('default');
  const [customAmount, setCustomAmount] = useState('');
  const [disableOnline, setDisableOnline] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<InvoiceResult | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [attendantOpen, setAttendantOpen] = useState(false);

  const hydrate = useCallback((data: EventDetail) => {
    setEvent(data);
    setGallery(Array.isArray(data.galleryLinks) && data.galleryLinks.length ? data.galleryLinks : [{ title: '', url: '' }]);
    setNextAction(data.nextAction ?? '');
    setPaymentLink(data.stripePaymentLink ?? '');
    setReceiptLink(data.stripeReceiptLink ?? '');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch(`/api/events/${encodeURIComponent(eventId)}`);
      if (!response.ok) {
        showToast(await errorMessage(response, 'Could not load the event'), 'error');
        return;
      }
      hydrate(await response.json());
    } finally {
      setLoading(false);
    }
  }, [eventId, hydrate, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Esc closes the open modal first, then the panel. Modals opened from the page sit on top.
  const modalOpen = invoiceOpen || attendantOpen || preview !== null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-event-drawer])') && !modalOpen) return;
      if (invoiceOpen) setInvoiceOpen(false);
      else if (attendantOpen) setAttendantOpen(false);
      else if (preview) setPreview(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [invoiceOpen, attendantOpen, preview, modalOpen, onClose]);

  // Backdrop choices come from the attendant's backdrop tool.
  const backdropUrl = event?.backdropLink?.url ?? backdropLinks.find((l) => l.id === event?.backdropLinkId)?.url ?? null;
  useEffect(() => {
    setBackdropOptions([]);
    const attendantId = backdropUrl ? extractAttendantIdFromUrl(backdropUrl) : null;
    if (!attendantId) return;
    let cancelled = false;
    adminFetch(`/api/agreements/backdrop-options?attendantId=${encodeURIComponent(attendantId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) setBackdropOptions(data.backdrops || []);
      })
      .catch((error) => console.error('Error loading backdrop options:', error));
    return () => {
      cancelled = true;
    };
  }, [backdropUrl]);

  const patch = async (body: Record<string, unknown>, success?: string) => {
    if (!event) return false;
    setSaving(true);
    try {
      const response = await adminFetch(`/api/events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        showToast(await errorMessage(response, 'Could not save'), 'error');
        return false;
      }
      hydrate(await response.json());
      setFollowupsVersion((v) => v + 1);
      if (success) showToast(success);
      onChanged();
      return true;
    } catch (error) {
      console.error('Error saving event:', error);
      showToast('Could not save', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: EventDetail['status']) => {
    if (!event || status === event.status) return;
    let cancellationReason: string | undefined;
    if (status === 'CANCELLED') {
      const reason = window.prompt('Cancel this event? Its agreements will be cancelled too.\n\nReason (optional):', '');
      if (reason === null) return;
      cancellationReason = reason;
    }
    if (status === 'COMPLETED' && !window.confirm('Mark this event completed? A signed agreement on it will be marked completed too.')) {
      return;
    }
    await patch({ status, ...(cancellationReason !== undefined ? { cancellationReason } : {}) }, `Event marked ${STATUS_LABELS[status].toLowerCase()}`);
  };

  const archive = async (archived: boolean) => {
    if (!event) return;
    if (archived && !window.confirm('Archive this event and its agreements? You can unarchive it later.')) return;
    const response = await adminFetch('/api/events/archive', {
      method: archived ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id }),
    });
    if (!response.ok) {
      showToast(await errorMessage(response, 'Could not archive'), 'error');
      return;
    }
    showToast(archived ? 'Event archived' : 'Event unarchived');
    onChanged();
    if (archived) onClose();
    else load();
  };

  const openGalleryPreview = async () => {
    if (!event) return;
    const response = await adminFetch(`/api/agreements/send-gallery-ready-email?agreementId=${encodeURIComponent(event.id)}`);
    if (!response.ok) {
      showToast(await errorMessage(response, 'Could not build the gallery email'), 'error');
      return;
    }
    setPreview(await response.json());
  };

  const sendGallery = async () => {
    if (!event) return;
    setSendingGallery(true);
    try {
      const response = await adminFetch('/api/agreements/send-gallery-ready-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: event.id, resend: Boolean(event.galleryEmailSentAt) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(data.error || 'Could not send the gallery email', 'error');
        return;
      }
      showToast(data.message || 'Gallery email sent');
      setPreview(null);
      load();
      setFollowupsVersion((v) => v + 1);
    } finally {
      setSendingGallery(false);
    }
  };

  const sendReview = async () => {
    if (!event || !window.confirm(`Send the Google review request to ${event.client.email}?`)) return;
    const response = await adminFetch('/api/agreements/send-review-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreementId: event.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(data.error || 'Could not send the review request', 'error');
      return;
    }
    showToast(data.message || 'Review request sent');
    setFollowupsVersion((v) => v + 1);
  };

  const openInvoice = () => {
    if (!event) return;
    setInvoiceType(isDepositPaid(event.paymentStatus) ? 'total-minus-deposit' : 'default');
    setCustomAmount('');
    setDisableOnline(false);
    setInvoiceResult(null);
    setInvoiceError(null);
    setInvoiceOpen(true);
  };

  const createInvoice = async () => {
    if (!event) return;
    const body: Record<string, unknown> = { agreementId: event.id, invoiceType, disableOnlinePayment: disableOnline };
    if (invoiceType === 'custom-amount') {
      const amount = parseFloat(customAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setInvoiceError('Please enter a valid custom amount greater than 0');
        return;
      }
      body.customAmount = amount;
    }
    setCreatingInvoice(true);
    setInvoiceError(null);
    try {
      const response = await adminFetch('/api/agreements/create-stripe-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setInvoiceError(data.error || data.message || 'Failed to create invoice');
        return;
      }
      setInvoiceResult(data);
      showToast(`Created ${data.invoices?.length || 1} invoice(s)`);
      load();
      onChanged();
    } finally {
      setCreatingInvoice(false);
    }
  };

  if (loading && !event) {
    return (
      <Shell onClose={onClose}>
        <p className="text-admin-muted">Loading event...</p>
      </Shell>
    );
  }
  if (!event) {
    return (
      <Shell onClose={onClose}>
        <p className="text-admin-muted">This event could not be loaded.</p>
      </Shell>
    );
  }

  const clientName = `${event.client.firstName} ${event.client.lastName}`.trim();
  // InvoiceModal reads the price, client and a template title from an agreement-shaped object.
  const invoiceTarget = {
    client: { ...event.client, packagePrice: null },
    event: { packagePrice: event.packagePrice },
    template: { title: event.eventPackage || 'Photo booth rental' },
  } as unknown as Agreement;

  return (
    <Shell onClose={onClose}>
      <div className="mb-4">
        <h2 className="m-0 text-xl font-semibold text-admin-text">{clientName}</h2>
        <p className="m-0 mt-1 text-sm text-admin-muted">
          {event.eventDate ? formatEventDateToronto(event.eventDate) : 'No date'}
          {event.eventType ? ` · ${event.eventType}` : ''}
          {event.eventName ? ` · ${event.eventName}` : ''}
        </p>
        {event.archived && <p className="m-0 mt-2 text-sm font-semibold text-warn">Archived</p>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-admin-muted" htmlFor="event-status">Status</label>
        <select
          id="event-status"
          value={event.status}
          disabled={saving}
          onChange={(e) => changeStatus(e.target.value as EventDetail['status'])}
          className={`${fieldClass} !w-auto`}
        >
          {(Object.keys(STATUS_LABELS) as EventDetail['status'][]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <AdminButton size="compact" onClick={() => onEditDetails(event)}>
          Edit details
        </AdminButton>
        <AdminButton size="compact" onClick={() => archive(!event.archived)}>
          {event.archived ? 'Unarchive' : 'Archive'}
        </AdminButton>
      </div>
      {event.status === 'CANCELLED' && event.cancellationReason && (
        <p className="mb-4 mt-0 text-sm text-admin-muted">Cancelled: {event.cancellationReason}</p>
      )}

      <div className={`${metaPanelClass} text-sm text-admin-text`}>
        <div>{event.eventLocation || 'No venue yet'}</div>
        <div className="text-admin-muted">
          {[event.eventStartTime, event.eventDuration, event.eventPackage].filter(Boolean).join(' · ') || 'No time or package yet'}
          {event.packagePrice != null ? ` · $${Number(event.packagePrice).toFixed(2)}` : ''}
        </div>
        <div className="mt-2 text-admin-muted">
          {event.client.email}
          {event.client.phone ? ` · ${event.client.phone}` : ''}
          {event.eventPhone ? ` · day-of ${event.eventPhone}` : ''}
        </div>
        {event.notes && <p className="mb-0 mt-2 whitespace-pre-wrap">{event.notes}</p>}
      </div>

      <Section title="Agreement">
        {event.agreements.length === 0 ? (
          <p className="m-0 mb-3 text-sm text-admin-muted">No agreement. Add one if the client asks for it.</p>
        ) : (
          <ul className="m-0 mb-3 list-none p-0">
            {event.agreements.map((agreement) => (
              <li key={agreement.id} className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge variant={isUnsentDraft(agreement) ? 'warning' : agreement.status === 'CANCELLED' ? 'danger' : 'accent'}>
                  {agreementLabel(agreement)}
                </StatusBadge>
                <span className="text-admin-text">{agreement.template?.internalTitle || agreement.template?.title || 'Agreement'}</span>
                {agreement.archived && <span className="text-admin-muted">(archived)</span>}
                <AdminLink size="compact" href={`/admin/agreements?agreement=${encodeURIComponent(agreement.id)}`}>
                  Open
                </AdminLink>
              </li>
            ))}
          </ul>
        )}
        <AdminButton size="compact" variant="primary" onClick={() => onAddAgreement(event)}>
          + Create agreement
        </AdminButton>
      </Section>

      <Section title="Payment">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={event.paymentStatus}
            disabled={saving}
            onChange={(e) => patch({ paymentStatus: e.target.value }, 'Payment status saved')}
            className={`${fieldClass} !w-auto`}
            aria-label="Payment status"
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <AdminButton size="compact" onClick={openInvoice}>
            <UIcon name="credit-card" /> Create invoice
          </AdminButton>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={smallLabelClass}>Payment link</label>
            <input
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              onBlur={() => paymentLink !== (event.stripePaymentLink ?? '') && patch({ stripePaymentLink: paymentLink.trim() }, 'Payment link saved')}
              placeholder="https://"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={smallLabelClass}>Receipt link</label>
            <input
              value={receiptLink}
              onChange={(e) => setReceiptLink(e.target.value)}
              onBlur={() => receiptLink !== (event.stripeReceiptLink ?? '') && patch({ stripeReceiptLink: receiptLink.trim() }, 'Receipt link saved')}
              placeholder="https://"
              className={fieldClass}
            />
          </div>
        </div>
      </Section>

      <Section title="Attendant and backdrop">
        <label className={smallLabelClass}>Attendant</label>
        <select
          value={event.backdropLinkId ?? ''}
          disabled={saving}
          onChange={(e) => patch({ backdropLinkId: e.target.value || null, selectedBackdropName: null }, 'Attendant saved')}
          className={`${fieldClass} mb-3`}
        >
          <option value="">No attendant</option>
          {backdropLinks.map((link) => (
            <option key={link.id} value={link.id}>
              {backdropLinkLabel(link)}
            </option>
          ))}
        </select>
        {event.backdropLinkId && <AttendantConflictWarning agreementId={event.id} backdropLinkId={event.backdropLinkId} />}
        <label className={smallLabelClass}>Backdrop</label>
        <select
          value={event.selectedBackdropName ?? ''}
          disabled={saving || !event.backdropLinkId}
          onChange={(e) => patch({ selectedBackdropName: e.target.value || null }, 'Backdrop saved')}
          className={`${fieldClass} mb-3`}
        >
          <option value="">{event.backdropLinkId ? 'Not chosen yet' : 'Pick an attendant first'}</option>
          {event.selectedBackdropName && !backdropOptions.some((o) => o.name === event.selectedBackdropName) && (
            <option value={event.selectedBackdropName}>{event.selectedBackdropName}</option>
          )}
          {backdropOptions.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton size="compact" onClick={() => setAttendantOpen(true)}>
            <UIcon name="users" /> Attendant View
          </AdminButton>
          <span className="text-xs text-admin-muted">
            {[event.showPhoneNumberAlways && 'Phone always shown', event.forceVirtualGreenScreen && 'Virtual green screen'].filter(Boolean).join(' · ')}
          </span>
        </div>
      </Section>

      <Section title="Gallery">
        {gallery.map((link, index) => (
          <div key={index} className="mb-2 flex gap-2">
            <input
              value={link.title}
              onChange={(e) => setGallery((prev) => prev.map((g, i) => (i === index ? { ...g, title: e.target.value } : g)))}
              placeholder={index === 0 ? 'Photo Gallery' : `Gallery ${index + 1}`}
              className={`${fieldClass} !w-[40%]`}
            />
            <input
              value={link.url}
              onChange={(e) => setGallery((prev) => prev.map((g, i) => (i === index ? { ...g, url: e.target.value } : g)))}
              placeholder="https://"
              className={fieldClass}
            />
          </div>
        ))}
        <div className="mb-4 flex flex-wrap gap-2">
          <AdminButton size="compact" onClick={() => setGallery((prev) => [...prev, { title: '', url: '' }])}>
            + Add gallery
          </AdminButton>
          <AdminButton
            size="compact"
            variant="primary"
            disabled={saving}
            onClick={() => patch({ galleryLinks: gallery.filter((g) => g.url.trim()) }, 'Gallery links saved')}
          >
            Save galleries
          </AdminButton>
          <AdminButton size="compact" onClick={openGalleryPreview}>
            {event.galleryEmailSentAt ? 'Resend gallery email' : 'Send gallery email now'}
          </AdminButton>
          <AdminButton size="compact" onClick={sendReview}>
            Request Google review
          </AdminButton>
        </div>
        {event.galleryEmailSentAt && (
          <p className="m-0 mb-3 text-xs text-admin-muted">Gallery email sent {formatDateTimeToronto(event.galleryEmailSentAt)}</p>
        )}
        <FollowUpsPanel agreementId={event.id} refreshKey={followupsVersion} />
      </Section>

      <Section title="Next action">
        <textarea
          rows={2}
          value={nextAction}
          onChange={(e) => setNextAction(e.target.value)}
          onBlur={() => nextAction !== (event.nextAction ?? '') && patch({ nextAction }, 'Next action saved')}
          placeholder="What needs to happen next"
          className={fieldClass}
        />
      </Section>

      {event.clientNotes.length > 0 && (
        <Section title="Client notes">
          <ul className="m-0 list-none p-0">
            {event.clientNotes.map((note) => (
              <li key={note.id} className="mb-2 text-sm text-admin-text">
                <span className="text-xs text-admin-muted">{formatDateTimeToronto(note.createdAt)}</span>
                <p className="m-0 whitespace-pre-wrap">{note.content}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {invoiceOpen && (
        <InvoiceModal
          agreement={invoiceTarget}
          creating={creatingInvoice}
          result={invoiceResult}
          error={invoiceError}
          invoiceType={invoiceType}
          customAmount={customAmount}
          disableOnlinePayment={disableOnline}
          onType={setInvoiceType}
          onCustomAmount={setCustomAmount}
          onDisableOnline={setDisableOnline}
          onClose={() => setInvoiceOpen(false)}
          onCreate={createInvoice}
        />
      )}
      {attendantOpen && (
        <AttendantModal
          // The attendant link and toggles read these fields; the link uses the event id.
          agreement={{ id: event.id, showPhoneNumberAlways: event.showPhoneNumberAlways, forceVirtualGreenScreen: event.forceVirtualGreenScreen } as unknown as Agreement}
          updatingPhone={saving}
          updatingGreenScreen={saving}
          onClose={() => setAttendantOpen(false)}
          onTogglePhone={() => patch({ showPhoneNumberAlways: !event.showPhoneNumberAlways }, 'Saved')}
          onToggleGreenScreen={() => patch({ forceVirtualGreenScreen: !event.forceVirtualGreenScreen }, 'Saved')}
          showToast={showToast}
        />
      )}
      <GalleryReadyPreviewModal preview={preview} sending={sendingGallery} onClose={() => setPreview(null)} onSend={sendGallery} />
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[900] flex justify-end bg-black/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        data-event-drawer"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-[560px] overflow-y-auto border-l border-admin-hairline bg-admin-surface p-5 md:p-6"
      >
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="p-1 text-admin-muted hover:text-admin-text" aria-label="Close">
            <UIcon name="x" className="text-xl" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
