'use client';

import { useEffect, useId, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { getTorontoDateParts } from '@/lib/dates';
import { AdminButton } from '../../../components/AdminButton';
import { ModalFrame, ModalTitle } from './ModalFrame';
import { fieldClass, labelClass, modalActionsClass } from './uiClasses';

export function ExportCsvModal({
  open,
  onClose,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const titleId = useId();
  const errorId = useId();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const year = getTorontoDateParts(new Date()).year;
    setFrom(`${year}-01-01`);
    setTo(`${year}-12-31`);
    setIncludeArchived(false);
    setError('');
    setDownloading(false);
  }, [open]);

  if (!open) return null;

  const rangeInvalid = Boolean(from && to && from > to);

  async function download() {
    if (!from || !to || from > to || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (includeArchived) params.set('includeArchived', 'true');
      const response = await adminFetch(`/api/admin/export/agreements?${params.toString()}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = body?.error || 'Could not export agreements. Try the download again.';
        setError(message);
        showToast(message, 'error');
        return;
      }

      const blob = await response.blob();
      const filename =
        filenameFromDisposition(response.headers.get('Content-Disposition')) ??
        `agreements-${from}-to-${to}.csv`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (downloadError) {
      console.error('Agreement CSV export failed', downloadError);
      const message = 'Could not export agreements. Try the download again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ModalFrame
      onBackdropClick={downloading ? undefined : onClose}
      maxWidthClass="max-w-[440px]"
      labelledBy={titleId}
    >
      <ModalTitle>
        <span id={titleId}>Export CSV</span>
      </ModalTitle>
      <p className="mb-4 mt-0 text-sm text-admin-muted">
        One row per agreement whose event date falls in this range. The event record is used first, then the client record.
      </p>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="export-from" className={labelClass}>
            From
          </label>
          <input
            id="export-from"
            type="date"
            value={from}
            autoFocus
            onChange={(event) => setFrom(event.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="export-to" className={labelClass}>
            To
          </label>
          <input
            id="export-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-admin-text">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
          className="h-4 w-4 cursor-pointer"
        />
        Include archived
      </label>
      {rangeInvalid && (
        <p id={errorId} className="mb-4 mt-0 text-sm text-alert" role="alert">
          From must be on or before To.
        </p>
      )}
      {!rangeInvalid && error && (
        <p id={errorId} className="mb-4 mt-0 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      <div className={modalActionsClass}>
        <AdminButton variant="ghost" onClick={onClose} disabled={downloading}>
          Cancel
        </AdminButton>
        <AdminButton
          variant="primary"
          onClick={() => {
            void download();
          }}
          disabled={downloading || !from || !to || rangeInvalid}
          aria-describedby={rangeInvalid || error ? errorId : undefined}
        >
          {downloading ? 'Downloading...' : 'Download'}
        </AdminButton>
      </div>
    </ModalFrame>
  );
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="([^"]+)"/.exec(header);
  return match?.[1] || null;
}
