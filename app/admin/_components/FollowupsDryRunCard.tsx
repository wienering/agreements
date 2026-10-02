'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { AdminButton } from '../../components/AdminButton';

type RunItem = { agreementId: string; clientName: string; eventDateKey: string | null; result: string; detail?: string };

interface DryRunSummary {
  ranAt: string;
  launchDate: string;
  galleryEmails: RunItem[];
  reviewRequests: RunItem[];
  held: RunItem[];
}

function Section({ title, items, empty }: { title: string; items: RunItem[]; empty: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[13px] font-semibold text-admin-text">
        {title} <span className="font-normal text-admin-muted">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-admin-muted">{empty}</div>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0">
          {items.map((item) => (
            <li key={`${title}-${item.agreementId}`} className="text-xs text-admin-text">
              <a
                href={`/admin/agreements?agreement=${encodeURIComponent(item.agreementId)}`}
                className="font-medium text-accent underline"
              >
                {item.clientName}
              </a>
              {item.eventDateKey && <span className="text-admin-muted"> · event {item.eventDateKey}</span>}
              <span className="text-admin-muted"> · {item.result}{item.detail ? ` (${item.detail})` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Admin-only dry run of today's 10am follow-up run. Never sends, claims or alerts. */
export function FollowupsDryRunCard({ className }: { className: string }) {
  const [summary, setSummary] = useState<DryRunSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const response = await adminFetch('/api/admin/followups/dry-run', { method: 'POST' });
      if (response.ok) setSummary(await response.json());
      else setError('The dry run failed. Please try again.');
    } catch (runError) {
      console.error('Follow-ups dry run failed:', runError);
      setError('The dry run failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={`${className} mb-7`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 mb-1.5 text-lg font-bold text-admin-text">Post-event follow-ups</h3>
          <p className="m-0 text-[13px] text-admin-muted">
            Gallery emails and review requests go out automatically at 10am. Preview what today&rsquo;s run would do.
            Nothing is sent.
          </p>
        </div>
        <AdminButton variant="ghost" onClick={run} disabled={running}>
          {running ? 'Checking…' : 'Dry run today'}
        </AdminButton>
      </div>
      {error && <p className="m-0 text-sm text-alert">{error}</p>}
      {summary && (
        <div>
          <Section title="Gallery emails" items={summary.galleryEmails} empty="None due today." />
          <Section title="Review requests" items={summary.reviewRequests} empty="None due today." />
          <Section title="Galleries held (balance owing)" items={summary.held} empty="None held." />
          <p className="m-0 text-xs text-admin-muted">
            Checked {new Date(summary.ranAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' })}. Events before{' '}
            {summary.launchDate} are never emailed automatically.
          </p>
        </div>
      )}
    </div>
  );
}
