'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { UIcon } from '../../../components/UIcon';
import { ToggleSwitch } from './ToggleSwitch';
import { raisedPanelClass } from './uiClasses';

type StatusKind = 'sent' | 'scheduled' | 'held' | 'paused' | 'skipped' | 'waiting';

interface FollowupState {
  followUpsPaused: boolean;
  reviewReceived: boolean;
  gallery: { kind: StatusKind; label: string };
  review: { kind: StatusKind; label: string };
  launchDate: string;
  dryRun: boolean;
}

const kindClass: Record<StatusKind, string> = {
  sent: 'text-success',
  scheduled: 'text-admin-text',
  held: 'text-alert',
  paused: 'text-warn',
  skipped: 'text-admin-muted',
  waiting: 'text-admin-muted',
};

const kindIcon: Record<StatusKind, string> = {
  sent: 'check',
  scheduled: 'clock',
  held: 'circle-exclamation',
  paused: 'pause',
  skipped: 'minus',
  waiting: 'hourglass',
};

function StatusLine({ title, status }: { title: string; status: { kind: StatusKind; label: string } }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <UIcon name={kindIcon[status.kind]} className={`mt-0.5 text-sm ${kindClass[status.kind]}`} />
      <span className="text-admin-text">
        <strong>{title}:</strong> <span className={kindClass[status.kind]}>{status.label}</span>
      </span>
    </div>
  );
}

/**
 * Pause follow-ups, mark Already reviewed, and see where each automatic email stands.
 * `refreshKey` changes after a manual send so the status lines reload.
 */
export function FollowUpsPanel({ agreementId, refreshKey }: { agreementId: string; refreshKey: number }) {
  const [state, setState] = useState<FollowupState | null>(null);
  const [saving, setSaving] = useState<'pause' | 'reviewed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await adminFetch(`/api/agreements/${encodeURIComponent(agreementId)}/followups`);
      if (response.ok) setState(await response.json());
    } catch (loadError) {
      console.error('Error loading follow-ups:', loadError);
    }
  }, [agreementId]);

  useEffect(() => {
    setState(null);
    load();
  }, [load, refreshKey]);

  const update = async (field: 'followUpsPaused' | 'reviewReceived', value: boolean) => {
    setSaving(field === 'followUpsPaused' ? 'pause' : 'reviewed');
    setError(null);
    try {
      const response = await adminFetch(`/api/agreements/${encodeURIComponent(agreementId)}/followups`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (response.ok) setState(await response.json());
      else setError('Could not save. Please try again.');
    } catch (saveError) {
      console.error('Error saving follow-ups:', saveError);
      setError('Could not save. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  if (!state) {
    return <div className="mt-3 text-xs text-admin-muted">Loading follow-ups…</div>;
  }

  return (
    <div className={`mt-3 p-3 ${raisedPanelClass}`}>
      <div className="mb-2 text-[13px] font-semibold text-admin-text">Automatic follow-ups</div>
      <div className="mb-3 grid gap-1.5">
        <StatusLine title="Gallery email" status={state.gallery} />
        <StatusLine title="Review request" status={state.review} />
      </div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] text-admin-text">Pause follow-ups</span>
        <ToggleSwitch
          on={state.followUpsPaused}
          disabled={saving !== null}
          onClick={() => update('followUpsPaused', !state.followUpsPaused)}
          label="Pause follow-ups"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-admin-text">Already reviewed</span>
        <ToggleSwitch
          on={state.reviewReceived}
          disabled={saving !== null}
          onClick={() => update('reviewReceived', !state.reviewReceived)}
          label="Already reviewed"
        />
      </div>
      <p className="m-0 mt-2 text-xs text-admin-muted">
        Paused emails go out on the next 10am run after you unpause. Events before {state.launchDate} are never
        emailed automatically.
      </p>
      {state.dryRun && (
        <p className="m-0 mt-1 text-xs font-medium text-warn">
          Preview environment: sends here are dry runs and nothing reaches the client.
        </p>
      )}
      {error && <p className="m-0 mt-1 text-xs text-alert">{error}</p>}
    </div>
  );
}
