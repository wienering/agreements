'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { formatDateToronto } from '@/lib/dates';
import { adminEventHref } from '@/lib/leads/display';
import { AdminButton, AdminLink } from '../../components/AdminButton';
import { ModalFrame, ModalTitle } from '../agreements/_components/ModalFrame';
import type { LeadRecord } from './types';

type Props = {
  lead: LeadRecord;
  onClose: () => void;
  onBooked: () => void;
};

/**
 * Mark booked: confirm the details, then the CRM links or creates the client, adds an Upcoming
 * event (which goes on the calendar), sets the lead to Booked and marks its Sheet row "booked".
 */
export function MarkBookedDialog({ lead, onClose, onBooked }: Props) {
  const [form, setForm] = useState({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone ?? '',
    eventDate: lead.eventDate ? formatDateToronto(lead.eventDate) : '',
    eventStartTime: '',
    eventDuration: lead.quotePackageHours ? `${lead.quotePackageHours} hours` : '',
    eventLocation: lead.eventLocation ?? '',
    eventName: '',
    eventPackage: '',
    packagePrice: lead.quoteTotal != null ? String(lead.quoteTotal) : '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ eventId: string; clientCreated: boolean; eventLinked: boolean } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.eventDate) {
      setError('Pick the event date.');
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`/api/leads/${lead.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, packagePrice: form.packagePrice || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.details?.[0]?.message || 'Could not mark this lead booked');
        return;
      }
      setResult({ eventId: data.eventId, clientCreated: data.clientCreated, eventLinked: Boolean(data.eventLinked) });
      onBooked();
    } catch (err) {
      console.error(err);
      setError('Could not mark this lead booked');
    } finally {
      setSaving(false);
    }
  };

  const input =
    'box-border w-full rounded border border-admin-hairline bg-admin-bg px-3 py-2 text-sm text-admin-text';
  const label = 'mb-1 block text-xs font-medium text-admin-muted';

  if (result) {
    return (
      <ModalFrame onBackdropClick={onClose} maxWidthClass="max-w-[440px]" labelledBy="mark-booked-title">
        <div id="mark-booked-title">
          <ModalTitle>Booked</ModalTitle>
        </div>
        <p className="m-0 mb-4 text-sm text-admin-text">
          {result.eventLinked
            ? 'They already had a booking on that date, so the lead was linked to it (no duplicate event).'
            : result.clientCreated
              ? 'New client and event added.'
              : 'Event added to the existing client.'} The lead is
          marked booked, so the follow-up emails stop.
        </p>
        <div className="flex justify-end gap-3">
          <AdminButton variant="ghost" onClick={onClose}>
            Close
          </AdminButton>
          <AdminLink href={adminEventHref(result.eventId)} variant="primary">
            Open event
          </AdminLink>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame onBackdropClick={onClose} maxWidthClass="max-w-[520px]" labelledBy="mark-booked-title">
      <div id="mark-booked-title">
        <ModalTitle>Mark booked: {lead.firstName} {lead.lastName}</ModalTitle>
      </div>
      <form onSubmit={submit}>
        {error && <div className="mb-4 rounded bg-admin-surface-raised p-3 text-sm text-alert">{error}</div>}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>First name *</label>
            <input className={input} value={form.firstName} onChange={set('firstName')} required />
          </div>
          <div>
            <label className={label}>Last name</label>
            <input className={input} value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Email *</label>
            <input className={input} type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} value={form.phone} onChange={set('phone')} />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Event date *</label>
            <input className={input} type="date" value={form.eventDate} onChange={set('eventDate')} required />
          </div>
          <div>
            <label className={label}>Start time</label>
            <input className={input} value={form.eventStartTime} onChange={set('eventStartTime')} placeholder="7:00 PM" />
          </div>
          <div>
            <label className={label}>Duration</label>
            <input className={input} value={form.eventDuration} onChange={set('eventDuration')} placeholder="4 hours" />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Venue name</label>
            <input className={input} value={form.eventName} onChange={set('eventName')} />
          </div>
          <div>
            <label className={label}>Venue address</label>
            <input className={input} value={form.eventLocation} onChange={set('eventLocation')} />
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Package</label>
            <input className={input} value={form.eventPackage} onChange={set('eventPackage')} />
          </div>
          <div>
            <label className={label}>Price ($)</label>
            <input className={input} type="number" min="0" step="0.01" value={form.packagePrice} onChange={set('packagePrice')} />
          </div>
        </div>
        <div className="mb-4">
          <label className={label}>Event notes</label>
          <textarea className={input} rows={2} value={form.notes} onChange={set('notes')} />
        </div>
        <p className="m-0 mb-4 text-xs text-admin-muted">
          If a client with this email already exists, the event is added to them and their details stay as they are.
        </p>
        <div className="flex justify-end gap-3">
          <AdminButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Mark booked'}
          </AdminButton>
        </div>
      </form>
    </ModalFrame>
  );
}
