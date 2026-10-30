'use client';

import { adminFetch } from '@/lib/adminFetch';
import { formatDateToronto } from '@/lib/dates';
import { useEffect, useState } from 'react';
import { UIcon } from './UIcon';

interface EventOption {
  id: string;
  eventName?: string | null;
  eventDate?: string | Date | null;
}

interface UnassignedFile {
  id: string;
  fileName: string;
  fileType: string;
  googleDriveLink: string;
  createdAt: string;
}

interface UnassignedFilesProps {
  clientId: string;
  events: EventOption[];
  onAssigned?: (eventId: string) => void;
  onError?: (error: string) => void;
}

function eventLabel(event: EventOption): string {
  const date = event.eventDate ? formatDateToronto(event.eventDate) : 'No date';
  return event.eventName ? `${date} · ${event.eventName}` : date;
}

/**
 * Files uploaded before uploads became per-event that couldn't be matched to one event.
 * They show only here (not on attendant pages) and are never auto-deleted until assigned.
 */
export default function UnassignedFiles({ clientId, events, onAssigned, onError }: UnassignedFilesProps) {
  const [files, setFiles] = useState<UnassignedFile[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await adminFetch(`/api/files/client/${clientId}?unassigned=true`);
        if (response.ok) {
          const data = await response.json();
          setFiles(data.files || []);
        }
      } catch (err) {
        console.error('Error fetching unassigned files:', err);
      }
    };

    fetchFiles();
  }, [clientId]);

  if (files.length === 0) return null;

  const handleAssign = async (fileId: string) => {
    const eventId = selection[fileId];
    if (!eventId) return;
    setAssigningId(fileId);
    try {
      const response = await adminFetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to assign file');
      }
      setFiles(prev => prev.filter(file => file.id !== fileId));
      onAssigned?.(eventId);
    } catch (err: any) {
      onError?.(err.message || 'Failed to assign file');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      backgroundColor: 'var(--admin-surface)',
      border: '1px solid var(--status-action)',
      borderRadius: '2px',
    }}>
      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--admin-text)', marginBottom: '4px' }}>
        Unassigned files ({files.length})
      </div>
      <div style={{ fontSize: '12px', color: 'var(--admin-muted)', marginBottom: '8px' }}>
        Not shown to attendants and never auto-deleted until assigned to an event.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {files.map((file) => (
          <div
            key={file.id}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
          >
            <UIcon name={file.fileType.includes('zip') ? 'box' : 'image'} style={{ fontSize: '18px', color: 'var(--admin-text)' }} />
            <a
              href={file.googleDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: '1 1 160px', minWidth: 0, fontSize: '14px', color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {file.fileName}
            </a>
            <select
              value={selection[file.id] ?? ''}
              onChange={(e) => setSelection(prev => ({ ...prev, [file.id]: e.target.value }))}
              disabled={events.length === 0 || assigningId === file.id}
              aria-label={`Event for ${file.fileName}`}
              style={{
                padding: '6px 8px',
                fontSize: '13px',
                backgroundColor: 'var(--admin-bg)',
                color: 'var(--admin-text)',
                border: '1px solid var(--admin-hairline)',
                borderRadius: '2px',
                maxWidth: '100%',
              }}
            >
              <option value="">{events.length === 0 ? 'No events' : 'Assign to event…'}</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{eventLabel(event)}</option>
              ))}
            </select>
            <button
              onClick={() => handleAssign(file.id)}
              disabled={!selection[file.id] || assigningId === file.id}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: selection[file.id] ? 'var(--accent)' : 'var(--admin-hairline)',
                color: selection[file.id] ? 'var(--accent-on)' : 'var(--admin-muted)',
                border: 'none',
                borderRadius: '2px',
                cursor: selection[file.id] ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              {assigningId === file.id ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
