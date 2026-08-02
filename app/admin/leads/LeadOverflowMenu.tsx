'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AdminButton } from '../../components/AdminButton';
import type { LeadRecord, ManualArchiveReason } from './types';

type LeadOverflowMenuProps = {
  lead: LeadRecord;
  isArchived: boolean;
  borderColor: string;
  cardBg: string;
  mutedText: string;
  onView: (lead: LeadRecord) => void;
  onMarkContacted: (lead: LeadRecord) => void;
  onEdit: (lead: LeadRecord) => void;
  onArchive: (lead: LeadRecord, reason: ManualArchiveReason) => void;
  onRestore: (lead: LeadRecord) => void;
  onDelete: (lead: LeadRecord) => void;
};

export function LeadOverflowMenu({
  lead,
  isArchived,
  borderColor,
  cardBg,
  mutedText,
  onView,
  onMarkContacted,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: LeadOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [showArchiveReasons, setShowArchiveReasons] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      setShowArchiveReasons(false);
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const menuItemStyle = {
    width: '100%',
    justifyContent: 'flex-start' as const,
    borderRadius: '2px',
  };

  const run = (action: () => void) => {
    action();
    setOpen(false);
    setShowArchiveReasons(false);
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <AdminButton
        variant="ghost"
        size="compact"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="More actions"
        onClick={() => setOpen((value) => !value)}
        style={{ minWidth: '30px', padding: '0 8px' }}
      >
        ⋯
      </AdminButton>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${lead.firstName} ${lead.lastName}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '180px',
            padding: '6px',
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '2px',
            boxShadow: 'none',
            zIndex: 20,
            display: 'grid',
            gap: '4px',
          }}
        >
          <AdminButton
            role="menuitem"
            variant="ghost"
            size="compact"
            style={menuItemStyle}
            onClick={() => run(() => onView(lead))}
          >
            View
          </AdminButton>

          {!isArchived && (
            <AdminButton
              role="menuitem"
              variant="ghost"
              size="compact"
              style={menuItemStyle}
              onClick={() => run(() => onMarkContacted(lead))}
            >
              Mark contacted
            </AdminButton>
          )}

          <AdminButton
            role="menuitem"
            variant="ghost"
            size="compact"
            style={menuItemStyle}
            onClick={() => run(() => onEdit(lead))}
          >
            Edit
          </AdminButton>

          {!isArchived ? (
            showArchiveReasons ? (
              <>
                <div style={{ fontSize: '11px', color: mutedText, padding: '4px 8px 0' }}>
                  Archive reason
                </div>
                {(['booked', 'lost', 'manual'] as ManualArchiveReason[]).map((reason) => (
                  <AdminButton
                    key={reason}
                    role="menuitem"
                    variant="ghost"
                    size="compact"
                    style={menuItemStyle}
                    onClick={() => run(() => onArchive(lead, reason))}
                  >
                    {reason === 'booked' ? 'Booked' : reason === 'lost' ? 'Lost' : 'Manual'}
                  </AdminButton>
                ))}
              </>
            ) : (
              <AdminButton
                role="menuitem"
                variant="ghost"
                size="compact"
                style={menuItemStyle}
                onClick={() => setShowArchiveReasons(true)}
              >
                Archive…
              </AdminButton>
            )
          ) : (
            <AdminButton
              role="menuitem"
              variant="ghost"
              size="compact"
              style={menuItemStyle}
              onClick={() => run(() => onRestore(lead))}
            >
              Restore
            </AdminButton>
          )}

          <AdminButton
            role="menuitem"
            variant="danger"
            size="compact"
            style={menuItemStyle}
            onClick={() => run(() => onDelete(lead))}
          >
            Delete
          </AdminButton>
        </div>
      )}
    </div>
  );
}
