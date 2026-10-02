'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { ConflictList, conflictHeadline } from './DoubleBookingBadge';
import type { AttendantConflict } from './types';

/**
 * Shows what assigning the chosen attendant would clash with. Warn-only: saving is never blocked.
 */
export function AttendantConflictWarning({
  agreementId,
  backdropLinkId,
}: {
  agreementId: string;
  backdropLinkId: string;
}) {
  const [conflicts, setConflicts] = useState<AttendantConflict[]>([]);

  useEffect(() => {
    setConflicts([]);
    if (!agreementId || !backdropLinkId) return;
    let cancelled = false;
    const query = new URLSearchParams({ agreementId, backdropLinkId });
    adminFetch(`/api/admin/attendants/conflicts?${query.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { conflicts?: AttendantConflict[] } | null) => {
        if (!cancelled) setConflicts(data?.conflicts ?? []);
      })
      .catch((error) => console.error('Error checking attendant conflicts:', error));
    return () => {
      cancelled = true;
    };
  }, [agreementId, backdropLinkId]);

  if (conflicts.length === 0) return null;
  const definite = conflicts.some((c) => c.kind === 'conflict');

  return (
    <div
      role="status"
      className={`mb-3 rounded border px-3 py-2 ${definite ? 'border-alert' : 'border-warn'} bg-admin-surface-raised`}
    >
      <div className={`mb-1 text-sm font-semibold ${definite ? 'text-alert' : 'text-warn'}`}>
        {conflictHeadline(conflicts)} — this attendant already has a job that day
      </div>
      <ConflictList conflicts={conflicts} />
      <p className="m-0 mt-1 text-xs text-admin-muted">This is a warning only. You can still assign them.</p>
    </div>
  );
}
