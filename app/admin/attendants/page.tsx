'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { AdminButton } from '../../components/AdminButton';
import { UIcon } from '../../components/UIcon';

interface Attendant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  externalId: string;
  backdropLinks: { id: string; name: string }[];
  activeAgreements: number;
}

interface Buffers {
  setupMinutes: number;
  teardownMinutes: number;
  travelMinutes: number;
}

type FormState = {
  name: string;
  externalId: string;
  email: string;
  phone: string;
  notes: string;
  active: boolean;
};

const emptyForm: FormState = { name: '', externalId: '', email: '', phone: '', notes: '', active: true };

const inputClass =
  'w-full rounded border border-admin-hairline bg-admin-bg px-3 py-2 text-sm text-admin-text outline-none focus:border-accent';
const labelClass = 'mb-1 block text-[13px] font-medium text-admin-text';
const cardClass = 'rounded border border-admin-hairline bg-admin-surface p-4 md:p-5';

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  const detail = Array.isArray(data.details) && data.details[0]?.message;
  return detail || data.error || fallback;
}

export default function AttendantsPage() {
  useEffect(() => {
    document.title = 'Attendants | Admin | Photobooth Guys';
  }, []);

  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Attendant | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [buffers, setBuffers] = useState<Buffers | null>(null);
  const [buffersMessage, setBuffersMessage] = useState<string | null>(null);
  const [savingBuffers, setSavingBuffers] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [listResponse, settingsResponse] = await Promise.all([
        adminFetch('/api/admin/attendants'),
        adminFetch('/api/admin/attendants/settings'),
      ]);
      if (listResponse.ok) setAttendants((await listResponse.json()).attendants || []);
      if (settingsResponse.ok) setBuffers((await settingsResponse.json()).buffers);
    } catch (error) {
      console.error('Error loading attendants:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (attendant: Attendant) => {
    setEditing(attendant);
    setForm({
      name: attendant.name,
      externalId: attendant.externalId,
      email: attendant.email ?? '',
      phone: attendant.phone ?? '',
      notes: attendant.notes ?? '',
      active: attendant.active,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const body = editing
        ? { name: form.name, email: form.email, phone: form.phone, notes: form.notes, active: form.active }
        : form;
      const response = await adminFetch(editing ? `/api/admin/attendants/${editing.id}` : '/api/admin/attendants', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setFormError(await errorMessage(response, 'Could not save the attendant.'));
        return;
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      console.error('Error saving attendant:', error);
      setFormError('Could not save the attendant.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (attendant: Attendant) => {
    const response = await adminFetch(`/api/admin/attendants/${attendant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !attendant.active }),
    });
    if (response.ok) await load();
  };

  const saveBuffers = async () => {
    if (!buffers) return;
    setSavingBuffers(true);
    setBuffersMessage(null);
    try {
      const response = await adminFetch('/api/admin/attendants/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buffers),
      });
      setBuffersMessage(response.ok ? 'Saved.' : await errorMessage(response, 'Could not save the buffers.'));
    } finally {
      setSavingBuffers(false);
    }
  };

  const hubUrl = (attendant: Attendant) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/attendants/${attendant.externalId}/hub`;

  const copyHub = async (attendant: Attendant) => {
    try {
      await navigator.clipboard.writeText(hubUrl(attendant));
      setCopiedId(attendant.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy hub link:', error);
    }
  };

  const bufferField = (key: keyof Buffers, label: string, hint: string) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={0}
        max={600}
        step={5}
        value={buffers?.[key] ?? ''}
        onChange={(event) =>
          setBuffers((current) => (current ? { ...current, [key]: Number(event.target.value) } : current))
        }
        className={inputClass}
      />
      <span className="mt-1 block text-xs text-admin-muted">{hint}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-admin-bg p-6 max-[768px]:p-4">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="admin-page-title m-0">Attendants</h1>
            <div className="admin-title-rule" aria-hidden="true" />
            <p className="m-0 mt-2 text-sm text-admin-muted">
              People who run events. Assign them on an agreement by choosing their backdrop link.
            </p>
          </div>
          <AdminButton variant="primary" onClick={openAdd}>
            + Add attendant
          </AdminButton>
        </div>

        <div className={`${cardClass} mb-6`}>
          {loading ? (
            <div className="py-8 text-center text-sm text-admin-muted">Loading attendants…</div>
          ) : attendants.length === 0 ? (
            <div className="py-8 text-center text-sm text-admin-muted">No attendants yet.</div>
          ) : (
            <ul className="m-0 list-none divide-y divide-admin-hairline p-0">
              {attendants.map((attendant) => (
                <li key={attendant.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-admin-text">{attendant.name}</span>
                      {!attendant.active && (
                        <span className="rounded bg-admin-hairline px-1.5 py-0.5 text-[11px] font-medium text-admin-muted">
                          Inactive
                        </span>
                      )}
                      <span className="text-xs text-admin-muted">
                        {attendant.activeAgreements} active {attendant.activeAgreements === 1 ? 'booking' : 'bookings'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-admin-muted">
                      {attendant.email && <span>{attendant.email}</span>}
                      {attendant.phone && <span>{attendant.phone}</span>}
                      <span>
                        Backdrop link{attendant.backdropLinks.length === 1 ? '' : 's'}:{' '}
                        {attendant.backdropLinks.length > 0
                          ? attendant.backdropLinks.map((link) => link.name).join(', ')
                          : 'none — connect one on the Backdrop Links page'}
                      </span>
                    </div>
                    {attendant.notes && <p className="m-0 mt-1 text-xs text-admin-muted">{attendant.notes}</p>}
                    <div className="mt-1 break-all font-mono text-[11px] text-admin-muted">ID {attendant.externalId}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={hubUrl(attendant)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-accent no-underline"
                    >
                      View hub →
                    </a>
                    <AdminButton variant="ghost" size="compact" onClick={() => copyHub(attendant)}>
                      {copiedId === attendant.id ? '✓ Copied' : 'Copy hub link'}
                    </AdminButton>
                    <AdminButton variant="ghost" size="compact" onClick={() => openEdit(attendant)}>
                      Edit
                    </AdminButton>
                    <AdminButton variant="ghost" size="compact" onClick={() => toggleActive(attendant)}>
                      {attendant.active ? 'Deactivate' : 'Activate'}
                    </AdminButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cardClass}>
          <h2 className="m-0 mb-1 flex items-center gap-2 text-base font-bold text-admin-text">
            <UIcon name="clock" className="text-base" />
            Double-booking check
          </h2>
          <p className="m-0 mb-4 text-[13px] text-admin-muted">
            Two jobs for one attendant on the same day are flagged when, after adding these times, they overlap or
            leave less than the travel time between them. A job with no start time is flagged as a possible conflict.
            Warnings never block a booking.
          </p>
          {buffers ? (
            <>
              <div className="mb-4 grid gap-4 md:grid-cols-3">
                {bufferField('setupMinutes', 'Setup (minutes)', 'Before the start time')}
                {bufferField('teardownMinutes', 'Teardown (minutes)', 'After the end time')}
                {bufferField('travelMinutes', 'Travel (minutes)', 'Between one job and the next')}
              </div>
              <div className="flex items-center gap-3">
                <AdminButton variant="primary" onClick={saveBuffers} disabled={savingBuffers}>
                  {savingBuffers ? 'Saving…' : 'Save buffers'}
                </AdminButton>
                {buffersMessage && <span className="text-sm text-admin-muted">{buffersMessage}</span>}
              </div>
            </>
          ) : (
            <div className="text-sm text-admin-muted">Loading…</div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[520px] rounded border border-admin-hairline bg-admin-surface p-6">
            <h2 className="m-0 mb-4 text-lg font-bold text-admin-text">
              {editing ? `Edit ${editing.name}` : 'Add attendant'}
            </h2>
            <div className="grid gap-3">
              <label className="block">
                <span className={labelClass}>Name</span>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Attendant ID from the backdrop tool</span>
                <input
                  className={`${inputClass} font-mono ${editing ? 'opacity-60' : ''}`}
                  value={form.externalId}
                  readOnly={Boolean(editing)}
                  placeholder="e.g. cmgiq33jp0000ib044hfii2vk"
                  onChange={(event) => setForm({ ...form, externalId: event.target.value })}
                />
                <span className="mt-1 block text-xs text-admin-muted">
                  {editing
                    ? "Can't be changed: hub and backdrop links use it."
                    : 'Create the attendant in the backdrop tool first, then paste their ID here.'}
                </span>
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Email (optional)</span>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Phone (optional)</span>
                  <input
                    type="tel"
                    className={inputClass}
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                <span className={labelClass}>Notes (optional)</span>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                />
                Active
              </label>
              <p className="m-0 text-xs text-admin-muted">
                Email and phone are only shown in admin. They never appear on hub or job pages.
              </p>
            </div>
            {formError && <p className="m-0 mt-3 text-sm text-alert">{formError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <AdminButton variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={save}
                disabled={saving || !form.name.trim() || (!editing && !form.externalId.trim())}
              >
                {saving ? 'Saving…' : editing ? 'Save' : 'Add'}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
