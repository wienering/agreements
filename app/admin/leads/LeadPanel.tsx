'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { formatDateTimeToronto, formatEventDateTorontoShort } from '@/lib/dates';
import { adminEventHref, getPrimaryLeadAction, isOpenLeadStatus, needsReply } from '@/lib/leads/display';
import { LEAD_STATUS_LABELS } from '@/lib/leads/status';
import { AdminButton, AdminLink } from '../../components/AdminButton';
import { StatusBadge } from '../../components/StatusBadge';
import { CloseIconButton, ModalFrame } from '../agreements/_components/ModalFrame';
import { statusBadgeVariant } from './LeadRow';
import type { LeadRecord, LeadStatusValue } from './types';

type Activity = {
  id: string;
  kind: string;
  touchNumber: number | null;
  summary: string | null;
  source: string;
  occurredAt: string;
};

const KIND_LABELS: Record<string, string> = {
  CREATED: 'Came in',
  EMAIL_SENT: 'Email',
  SMS_SENT: 'Text',
  REPLY_DETECTED: 'Reply',
  STATUS_CHANGED: 'Status',
  DELAYED: 'Follow-up moved',
  NOTE: 'Note',
  CALL: 'Call',
};

type Props = {
  lead: LeadRecord;
  onClose: () => void;
  onChanged: () => void;
  onMarkBooked: (lead: LeadRecord) => void;
  onSetStatus: (lead: LeadRecord, status: LeadStatusValue, lostReason?: string) => Promise<void> | void;
};

/** One lead: details, status actions, the timeline of every touch, and notes. */
export function LeadPanel({ lead, onClose, onChanged, onMarkBooked, onSetStatus }: Props) {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await adminFetch(`/api/leads/${lead.id}/activity`);
    if (res.ok) {
      const data = await res.json();
      setActivities(data.activities);
    } else {
      setActivities([]);
    }
  }, [lead.id]);

  useEffect(() => {
    load();
  }, [load, lead.status, lead.contactCount]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Don't throw away a half-written note.
      if (event.key === 'Escape' && !text.trim()) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, text]);

  const when = (value: Date | string) => formatDateTimeToronto(value, { dateStyle: 'medium', timeStyle: 'short' });

  const add = async (kind: 'NOTE' | 'CALL') => {
    if (!text.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminFetch(`/api/leads/${lead.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, summary: text.trim() }),
      });
      if (res.ok) {
        setText('');
        await load();
        if (kind === 'CALL') onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not save');
      }
    } finally {
      setSaving(false);
    }
  };

  const primary = getPrimaryLeadAction(lead);
  const isOpen = isOpenLeadStatus(lead.status);
  const facts: Array<[string, string]> = [
    ['Email', lead.email],
    ['Phone', lead.phone || '—'],
    ['Event date', lead.eventDate ? formatEventDateTorontoShort(lead.eventDate) : '—'],
    ['Location', lead.eventLocation || '—'],
    ['Hours', lead.quotePackageHours != null ? String(lead.quotePackageHours) : '—'],
    ['Came from', lead.source === 'QUOTE' ? 'Quote tool' : lead.source === 'BOOKING_FORM' ? 'Booking form' : 'Added by hand'],
    ['Touches', String(lead.contactCount)],
    ['Last contacted', lead.lastContactedAt ? when(lead.lastContactedAt) : '—'],
    ['Next follow-up', lead.nextFollowUpAt && lead.status === 'FOLLOWING_UP' ? formatEventDateTorontoShort(lead.nextFollowUpAt) : '—'],
    ['Last reply', lead.lastReplyAt ? when(lead.lastReplyAt) : '—'],
  ];

  return (
    <ModalFrame onBackdropClick={onClose} maxWidthClass="max-w-[640px]" labelledBy="lead-panel-title">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 id="lead-panel-title" className="m-0 text-lg text-admin-text">
            {lead.firstName} {lead.lastName}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge variant={statusBadgeVariant(lead.status)}>
              {LEAD_STATUS_LABELS[lead.status]}
              {lead.status === 'LOST' && lead.lostReason ? ` · ${lead.lostReason}` : ''}
            </StatusBadge>
            {needsReply(lead) && <StatusBadge variant="warning">Replied</StatusBadge>}
            {lead.sheetSyncError && <StatusBadge variant="danger">Sheet not updated</StatusBadge>}
          </div>
        </div>
        <CloseIconButton onClick={onClose} title="Close" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {primary?.kind === 'mark_booked' && (
          <AdminButton variant="primary" size="compact" onClick={() => onMarkBooked(lead)}>
            Mark booked
          </AdminButton>
        )}
        {lead.eventId && (
          <AdminLink href={adminEventHref(lead.eventId)} variant="primary" size="compact">
            View event
          </AdminLink>
        )}
        {lead.status === 'PAUSED' ? (
          <AdminButton variant="ghost" size="compact" onClick={() => onSetStatus(lead, 'FOLLOWING_UP')}>
            Resume follow-ups
          </AdminButton>
        ) : (
          isOpen && (
            <AdminButton variant="ghost" size="compact" onClick={() => onSetStatus(lead, 'PAUSED')}>
              Pause follow-ups
            </AdminButton>
          )
        )}
      </div>

      {lead.sheetSyncError && (
        <p className="m-0 mb-4 rounded bg-admin-surface-raised p-3 text-xs text-alert">
          The Sheet wasn&apos;t updated: {lead.sheetSyncError}. Use &quot;Retry Sheet sync&quot; in the row menu.
        </p>
      )}

      <dl className="m-0 mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {facts.map(([term, value]) => (
          <div key={term} className="min-w-0">
            <dt className="text-xs text-admin-muted">{term}</dt>
            <dd className="m-0 break-words text-admin-text">{value}</dd>
          </div>
        ))}
      </dl>

      {lead.notes && (
        <div className="mb-4">
          <div className="mb-1 text-xs text-admin-muted">Lead details</div>
          <div className="whitespace-pre-wrap text-sm text-admin-text">{lead.notes}</div>
        </div>
      )}

      <div className="mb-4">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          placeholder="Add a note, or what was said on a call"
          className="box-border w-full rounded border border-admin-hairline bg-admin-bg px-3 py-2 text-sm text-admin-text"
        />
        {error && <div className="mt-1 text-xs text-alert">{error}</div>}
        <div className="mt-2 flex justify-end gap-2">
          <AdminButton variant="ghost" size="compact" disabled={saving || !text.trim()} onClick={() => add('CALL')}>
            Log call
          </AdminButton>
          <AdminButton variant="primary" size="compact" disabled={saving || !text.trim()} onClick={() => add('NOTE')}>
            Add note
          </AdminButton>
        </div>
      </div>

      <div className="mb-2 text-xs font-semibold text-admin-muted">Timeline</div>
      {activities === null ? (
        <div className="text-sm text-admin-muted">Loading...</div>
      ) : activities.length === 0 ? (
        <div className="text-sm text-admin-muted">Nothing logged yet.</div>
      ) : (
        <ol className="m-0 list-none p-0">
          {activities.map((activity) => (
            <li key={activity.id} className="border-t border-admin-hairline py-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-admin-text">
                  {KIND_LABELS[activity.kind] ?? activity.kind}
                  {activity.touchNumber ? ` #${activity.touchNumber}` : ''}
                </span>
                <span className="shrink-0 text-xs text-admin-muted">
                  {when(activity.occurredAt)}
                </span>
              </div>
              {activity.summary && (
                <div className="mt-1 whitespace-pre-wrap text-admin-text">{activity.summary}</div>
              )}
              <div className="mt-1 text-xs text-admin-muted">
                {activity.source === 'n8n' ? 'n8n' : activity.source === 'admin' ? 'You' : activity.source}
              </div>
            </li>
          ))}
        </ol>
      )}
    </ModalFrame>
  );
}
