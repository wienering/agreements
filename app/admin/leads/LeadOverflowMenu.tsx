'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AdminButton } from '../../components/AdminButton';
import { LOST_REASONS } from '@/lib/leads/status';
import { isOpenLeadStatus } from '@/lib/leads/display';
import type { LeadRecord, LeadStatusValue } from './types';

type LeadOverflowMenuProps = {
  lead: LeadRecord;
  isArchived: boolean;
  borderColor: string;
  cardBg: string;
  mutedText: string;
  onOpen: (lead: LeadRecord) => void;
  onEdit: (lead: LeadRecord) => void;
  onCreateQuote: (lead: LeadRecord) => void;
  onSetStatus: (lead: LeadRecord, status: LeadStatusValue, lostReason?: string) => void;
  onRetrySync: (lead: LeadRecord) => void;
  onArchive: (lead: LeadRecord) => void;
  onRestore: (lead: LeadRecord) => void;
  onDelete: (lead: LeadRecord) => void;
};

export function LeadOverflowMenu({
  lead,
  isArchived,
  borderColor,
  cardBg,
  mutedText,
  onOpen,
  onEdit,
  onCreateQuote,
  onSetStatus,
  onRetrySync,
  onArchive,
  onRestore,
  onDelete,
}: LeadOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [showLostReasons, setShowLostReasons] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // The lead list clips overflow, so the menu is positioned against the
  // viewport and clamped to stay fully on screen (flips above when needed).
  const placeMenu = useCallback(() => {
    const anchor = buttonRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const margin = 8;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchor.right - width;
    if (left < margin) left = anchor.left;
    left = Math.max(margin, Math.min(left, vw - width - margin));

    let top = anchor.bottom + 4;
    if (top + height > vh - margin && anchor.top - height - 4 >= margin) {
      top = anchor.top - height - 4;
    }
    setMenuPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    placeMenu();
  }, [open, showLostReasons, placeMenu]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [open, placeMenu]);

  useEffect(() => {
    if (!open) {
      setShowLostReasons(false);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
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
    setShowLostReasons(false);
  };

  const isOpenStatus = isOpenLeadStatus(lead.status);

  const item = (label: string, action: () => void, variant: 'ghost' | 'danger' = 'ghost') => (
    <AdminButton role="menuitem" variant={variant} size="compact" style={menuItemStyle} onClick={() => run(action)}>
      {label}
    </AdminButton>
  );

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div ref={buttonRef} style={{ display: 'inline-flex' }}>
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
      </div>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`Actions for ${lead.firstName} ${lead.lastName}`}
          style={{
            position: 'fixed',
            top: menuPos?.top ?? 0,
            left: menuPos?.left ?? 0,
            visibility: menuPos ? 'visible' : 'hidden',
            minWidth: '210px',
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: 'calc(100vh - 16px)',
            overflowY: 'auto',
            padding: '6px',
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '2px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
            zIndex: 990,
            display: 'grid',
            gap: '4px',
          }}
        >
          {showLostReasons ? (
            <>
              <div style={{ fontSize: '11px', color: mutedText, padding: '4px 8px 0' }}>Why was it lost?</div>
              {LOST_REASONS.map((reason) => (
                <AdminButton
                  key={reason}
                  role="menuitem"
                  variant="ghost"
                  size="compact"
                  style={menuItemStyle}
                  onClick={() => run(() => onSetStatus(lead, 'LOST', reason))}
                >
                  {reason.charAt(0).toUpperCase() + reason.slice(1)}
                </AdminButton>
              ))}
            </>
          ) : (
            <>
              {item('Open (timeline & notes)', () => onOpen(lead))}
              {item('Edit details', () => onEdit(lead))}
              {isOpenStatus && item('Create quote', () => onCreateQuote(lead))}

              {lead.status === 'PAUSED'
                ? item('Resume follow-ups', () => onSetStatus(lead, 'FOLLOWING_UP'))
                : isOpenStatus && item('Pause follow-ups', () => onSetStatus(lead, 'PAUSED'))}

              {isOpenStatus && (
                <AdminButton
                  role="menuitem"
                  variant="ghost"
                  size="compact"
                  style={menuItemStyle}
                  onClick={() => setShowLostReasons(true)}
                >
                  Mark lost…
                </AdminButton>
              )}

              {(lead.status === 'LOST' || lead.status === 'BOOKED') &&
                !lead.eventId &&
                item('Reopen', () => onSetStatus(lead, 'FOLLOWING_UP'))}

              {lead.sheetSyncError && item('Retry Sheet sync', () => onRetrySync(lead))}

              {!isArchived ? item('Archive', () => onArchive(lead)) : item('Restore', () => onRestore(lead))}

              {item('Delete', () => onDelete(lead), 'danger')}
            </>
          )}
        </div>
      )}
    </div>
  );
}
