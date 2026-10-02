'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminButton } from '@/app/components/AdminButton';
import type { BalanceAction } from '@/lib/balanceActionToken';
import { adminFetch } from '@/lib/adminFetch';

const ACTION_TITLE: Record<BalanceAction, string> = {
  mark_paid: 'Mark as paid',
  remind: 'Email client a reminder',
  snooze: 'Snooze 3 days',
};

export function BalanceActionForm({
  token,
  action,
  agreementId,
  clientName,
  eventLabel,
  defaultSubject,
  defaultMessage,
}: {
  token: string;
  action: BalanceAction;
  agreementId: string;
  clientName: string;
  eventLabel: string;
  defaultSubject: string;
  defaultMessage: string;
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const adminHref = `/admin/agreements?agreement=${encodeURIComponent(agreementId)}`;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await adminFetch('/api/admin/balance-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...(action === 'remind' ? { subject, message } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error || 'Could not complete that action.');
        return;
      }
      setDone(data.message || 'Done.');
    } catch (submitError) {
      console.error('Balance action failed', submitError);
      setError('Could not complete that action.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="m-0 text-2xl font-semibold text-admin-text">{done}</h1>
        <p className="mt-4 mb-0">
          <Link href={adminHref} className="text-accent">
            Back to the agreement
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-admin-muted">
        {ACTION_TITLE[action]}
      </p>
      <h1 className="mt-2 mb-0 text-2xl font-semibold text-admin-text">{clientName}</h1>
      <p className="mt-2 mb-6 text-admin-muted">{eventLabel}</p>

      {action === 'remind' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="mb-1.5 block text-[13px] font-medium text-admin-text" htmlFor="balance-subject">
            Subject
          </label>
          <input
            id="balance-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="mb-4 w-full rounded border border-admin-hairline bg-admin-surface px-3 py-2 text-sm text-admin-text outline-none"
          />
          <label className="mb-1.5 block text-[13px] font-medium text-admin-text" htmlFor="balance-message">
            Message
          </label>
          <textarea
            id="balance-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={14}
            className="mb-2 w-full rounded border border-admin-hairline bg-admin-surface px-3 py-2 text-sm text-admin-text outline-none"
          />
          <p className="mb-4 text-xs text-admin-muted">Nothing is sent until you press Send.</p>
          {error && <p className="mb-4 text-sm text-alert">{error}</p>}
          <AdminButton type="submit" variant="primary" disabled={busy || !subject.trim() || !message.trim()}>
            {busy ? 'Sending...' : 'Send'}
          </AdminButton>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <p className="mb-4 text-sm text-admin-text">
            {action === 'mark_paid'
              ? 'This sets the payment status to Fully paid.'
              : 'This hides the event from the balance digest for 3 days.'}
          </p>
          {error && <p className="mb-4 text-sm text-alert">{error}</p>}
          <AdminButton type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving...' : 'Confirm'}
          </AdminButton>
        </form>
      )}
    </>
  );
}
