'use client';

import { adminFetch } from '@/lib/adminFetch';
import { fromTorontoDateTimeLocalInput } from '@/lib/dates';
import { useEffect, useState, type FormEvent } from 'react';
import SearchableSelect from '../../../components/SearchableSelect';
import { AdminButton } from '../../../components/AdminButton';
import { getDefaultExpirationDate } from './agreementUtils';
import { ModalFrame } from './ModalFrame';
import type { Agreement, ClientOption, TemplateOption } from './types';
import { fieldClass, labelClass } from './uiClasses';

export function CreateAgreementModal({
  open,
  onClose,
  clients,
  templates,
  initial,
  onCreated,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  clients: ClientOption[];
  templates: TemplateOption[];
  initial: { clientId: string; eventId: string; templateId: string };
  onCreated: (agreement: Agreement) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => ({
    clientId: initial.clientId,
    templateId: initial.templateId,
    eventId: initial.eventId,
    expiresAt: getDefaultExpirationDate(),
    secondSignerEnabled: false,
    secondSignerFirstName: '',
    secondSignerLastName: '',
    secondSignerEmail: '',
    secondSignerPhone: '',
    requireBothSignatures: false,
  }));

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...current,
      clientId: initial.clientId || current.clientId,
      eventId: initial.eventId || current.eventId,
      templateId: initial.templateId || current.templateId,
    }));
  }, [open, initial.clientId, initial.eventId, initial.templateId]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const expiresAtUtc = fromTorontoDateTimeLocalInput(form.expiresAt);
    if (Number.isNaN(expiresAtUtc.getTime())) {
      showToast('Invalid expiration date — please re-select a date and time', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await adminFetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expiresAt: expiresAtUtc.toISOString() }),
      });
      if (response.ok) {
        onCreated(await response.json());
        setForm({
          clientId: '',
          templateId: '',
          eventId: '',
          expiresAt: getDefaultExpirationDate(),
          secondSignerEnabled: false,
          secondSignerFirstName: '',
          secondSignerLastName: '',
          secondSignerEmail: '',
          secondSignerPhone: '',
          requireBothSignatures: false,
        });
        onClose();
        showToast('Agreement created successfully!');
      } else {
        try {
          const error = await response.json();
          showToast(`Error: ${error.error || error.message || 'Unknown error occurred'}`, 'error');
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          showToast(`Error: Failed to create agreement (${response.status})`, 'error');
        }
      }
    } catch (error) {
      console.error('Error creating agreement:', error);
      showToast('Failed to create agreement', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame onBackdropClick={onClose} maxWidthClass="max-w-[640px]">
      <h2 className="m-0 mb-4 text-lg text-admin-text">Create New Agreement</h2>
      <form onSubmit={submit}>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Client</label>
            <SearchableSelect
              options={clients.map((client) => ({
                id: client.id,
                label: `${client.firstName} ${client.lastName} (${client.email})`,
                value: client.id,
              }))}
              value={form.clientId}
              onChange={(value) => setForm({ ...form, clientId: value })}
              placeholder="Search and select a client..."
              required
            />
          </div>
          <div>
            <label className={labelClass}>Template</label>
            <select required value={form.templateId} onChange={(event) => setForm({ ...form, templateId: event.target.value })} className={fieldClass}>
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.internalTitle || template.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Expires At</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="mb-4 rounded border border-admin-hairline bg-admin-bg p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-admin-text">
            <input
              type="checkbox"
              checked={form.secondSignerEnabled}
              onChange={(event) => setForm({ ...form, secondSignerEnabled: event.target.checked })}
              className="h-4 w-4 cursor-pointer"
            />
            Add a second signer
          </label>
          <p className="mb-0 ml-6 mt-1 text-xs text-admin-muted">
            Either email on file will be able to unlock the agreement page to sign.
          </p>
          {form.secondSignerEnabled && (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Labeled value={form.secondSignerFirstName} label="Second Signer First Name" placeholder="First name" onChange={(value) => setForm({ ...form, secondSignerFirstName: value })} />
                <Labeled value={form.secondSignerLastName} label="Second Signer Last Name" placeholder="Last name" onChange={(value) => setForm({ ...form, secondSignerLastName: value })} />
                <Labeled value={form.secondSignerEmail} label="Second Signer Email" placeholder="email@example.com" type="email" required onChange={(value) => setForm({ ...form, secondSignerEmail: value })} />
                <Labeled value={form.secondSignerPhone} label="Second Signer Phone" placeholder="(555) 123-4567" type="tel" onChange={(value) => setForm({ ...form, secondSignerPhone: value })} />
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-admin-text">
                <input
                  type="checkbox"
                  checked={form.requireBothSignatures}
                  onChange={(event) => setForm({ ...form, requireBothSignatures: event.target.checked })}
                  className="h-4 w-4 cursor-pointer"
                />
                Require both signatures to make agreement binding
              </label>
              <p className="mb-0 ml-6 mt-1 text-xs text-admin-muted">
                When enabled, the agreement only becomes SIGNED after both people have signed.
              </p>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <AdminButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Agreement'}
          </AdminButton>
        </div>
      </form>
    </ModalFrame>
  );
}

function Labeled({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-admin-text">{label}</label>
      <input type={type} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={fieldClass} />
    </div>
  );
}
