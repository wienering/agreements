'use client';

import { useEffect, useId, useState } from 'react';
import { AdminButton, AdminLink } from '../../components/AdminButton';
import { StatusBadge, type StatusBadgeVariant } from '../../components/StatusBadge';
import {
  ARCHIVE_REASON_LABELS,
  formatFollowUpLine,
  formatLeadDateBadge,
  getPrimaryLeadAction,
  needsReply,
} from '@/lib/leads/display';
import { LEAD_STATUS_LABELS } from '@/lib/leads/status';
import { LeadOverflowMenu } from './LeadOverflowMenu';
import type { FoldedLeadRecord, LeadRecord, LeadStatusValue } from './types';
import { formatGroupedNumber } from '@/lib/dates';

export type LeadRowHandlers = {
  onOpen: (lead: LeadRecord) => void;
  onMarkBooked: (lead: LeadRecord) => void;
  onEdit: (lead: LeadRecord) => void;
  onCreateQuote: (lead: LeadRecord) => void;
  onSetStatus: (lead: LeadRecord, status: LeadStatusValue, lostReason?: string) => void;
  onRetrySync: (lead: LeadRecord) => void;
  onArchive: (lead: LeadRecord) => void;
  onRestore: (lead: LeadRecord) => void;
  onDelete: (lead: LeadRecord) => void;
};

type LeadRowProps = LeadRowHandlers & {
  folded: FoldedLeadRecord;
  forceExpanded?: boolean;
  tab: 'active' | 'archived' | 'all';
  borderColor: string;
  cardBg: string;
  textColor: string;
  mutedText: string;
};

function getDateBadgeVariant(group: ReturnType<typeof formatLeadDateBadge>['group']) {
  if (group === 'urgent') return 'warning' as const;
  if (group === 'coming_up') return 'accent' as const;
  return 'neutral' as const;
}

export function statusBadgeVariant(status: string): StatusBadgeVariant {
  if (status === 'BOOKED') return 'accent';
  if (status === 'LOST') return 'danger';
  return 'neutral';
}

function statusText(lead: LeadRecord): string {
  const label = LEAD_STATUS_LABELS[lead.status] ?? lead.status;
  return lead.status === 'LOST' && lead.lostReason ? `${label} · ${lead.lostReason}` : label;
}

function sourceText(lead: LeadRecord): string | null {
  if (lead.source === 'QUOTE') return 'Quote tool';
  if (lead.source === 'BOOKING_FORM') return 'Booking form';
  return null;
}

function LeadBadges({ lead, showArchiveReason }: { lead: LeadRecord; showArchiveReason: boolean }) {
  return (
    <>
      <StatusBadge variant={statusBadgeVariant(lead.status)}>{statusText(lead)}</StatusBadge>
      {needsReply(lead) && <StatusBadge variant="warning">Replied</StatusBadge>}
      {lead.sheetSyncError && <StatusBadge variant="danger">Sheet not updated</StatusBadge>}
      {showArchiveReason && lead.archivedAt && lead.archiveReason && (
        <StatusBadge variant="neutral">
          Archived: {ARCHIVE_REASON_LABELS[lead.archiveReason] ?? lead.archiveReason}
        </StatusBadge>
      )}
    </>
  );
}

function LeadRowActions({
  lead,
  tab,
  borderColor,
  cardBg,
  mutedText,
  handlers,
  showPrimaryAction = true,
}: {
  lead: LeadRecord;
  tab: LeadRowProps['tab'];
  borderColor: string;
  cardBg: string;
  mutedText: string;
  handlers: LeadRowHandlers;
  showPrimaryAction?: boolean;
}) {
  const primaryAction = getPrimaryLeadAction(lead);

  return (
    <div className="lead-worklist-actions">
      {showPrimaryAction && primaryAction?.kind === 'mark_booked' && (
        <AdminButton variant="primary" size="compact" onClick={() => handlers.onMarkBooked(lead)}>
          {primaryAction.label}
        </AdminButton>
      )}
      {showPrimaryAction && primaryAction?.kind === 'view_event' && (
        <AdminLink href={primaryAction.href} variant="primary" size="compact">
          {primaryAction.label}
        </AdminLink>
      )}

      <LeadOverflowMenu
        lead={lead}
        isArchived={Boolean(lead.archivedAt) || tab === 'archived'}
        borderColor={borderColor}
        cardBg={cardBg}
        mutedText={mutedText}
        onOpen={handlers.onOpen}
        onEdit={handlers.onEdit}
        onCreateQuote={handlers.onCreateQuote}
        onSetStatus={handlers.onSetStatus}
        onRetrySync={handlers.onRetrySync}
        onArchive={handlers.onArchive}
        onRestore={handlers.onRestore}
        onDelete={handlers.onDelete}
      />
    </div>
  );
}

function LeadInquirySubRow({
  lead,
  tab,
  borderColor,
  cardBg,
  textColor,
  mutedText,
  handlers,
}: {
  lead: LeadRecord;
  tab: LeadRowProps['tab'];
  borderColor: string;
  cardBg: string;
  textColor: string;
  mutedText: string;
  handlers: LeadRowHandlers;
}) {
  const dateBadge = formatLeadDateBadge(lead.eventDate);
  const followUp = formatFollowUpLine(lead);

  return (
    <div
      className="lead-worklist-subrow"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(96px, 112px) minmax(0, 1fr) auto',
        gap: '12px',
        alignItems: 'center',
        padding: '10px 16px 10px 32px',
        borderTop: `1px solid ${borderColor}`,
        backgroundColor: 'var(--admin-surface-raised)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
        <StatusBadge variant={getDateBadgeVariant(dateBadge.group)} style={{ borderRadius: '2px' }}>
          {dateBadge.primary}
        </StatusBadge>
        <span style={{ fontSize: '12px', color: mutedText }}>{dateBadge.secondary}</span>
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <LeadBadges lead={lead} showArchiveReason />
        </div>
        {followUp && <div style={{ fontSize: '12px', color: textColor, marginTop: '4px' }}>{followUp}</div>}
      </div>

      <LeadRowActions
        lead={lead}
        tab={tab}
        borderColor={borderColor}
        cardBg={cardBg}
        mutedText={mutedText}
        handlers={handlers}
        showPrimaryAction={false}
      />
    </div>
  );
}

export function LeadRow({
  folded,
  forceExpanded = false,
  tab,
  borderColor,
  cardBg,
  textColor,
  mutedText,
  ...handlers
}: LeadRowProps) {
  const lead = folded.primary;
  const isFolded = folded.others.length > 0;
  const inquiryCount = folded.others.length + 1;
  const [expanded, setExpanded] = useState(false);
  const subRowsId = useId();

  useEffect(() => {
    setExpanded(forceExpanded);
  }, [forceExpanded]);

  const dateBadge = formatLeadDateBadge(lead.eventDate);
  const quoteTotal =
    lead.quoteTotal != null ? `$${formatGroupedNumber(Number(lead.quoteTotal), 'en-CA')}` : null;
  const followUp = formatFollowUpLine(lead);
  const source = sourceText(lead);
  const detail = [source, quoteTotal, followUp].filter(Boolean).join(' · ');

  return (
    <div style={{ borderBottom: `1px solid ${borderColor}` }}>
      <div className="lead-worklist-row" style={{ padding: '14px 16px', borderBottom: 'none' }}>
        <div
          aria-label={`Event date: ${dateBadge.primary}, ${dateBadge.secondary}`}
          style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}
        >
          <StatusBadge variant={getDateBadgeVariant(dateBadge.group)} style={{ borderRadius: '2px' }}>
            {dateBadge.primary}
          </StatusBadge>
          <span style={{ fontSize: '12px', color: mutedText }}>{dateBadge.secondary}</span>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {isFolded && (
              <AdminButton
                variant="ghost"
                size="compact"
                aria-expanded={expanded}
                aria-controls={subRowsId}
                onClick={() => setExpanded((value) => !value)}
                style={{ minWidth: '30px', padding: '0 8px' }}
                title={expanded ? 'Collapse inquiries' : 'Expand inquiries'}
              >
                {expanded ? '▾' : '▸'}
              </AdminButton>
            )}
            <button
              type="button"
              onClick={() => handlers.onOpen(lead)}
              style={{
                fontWeight: 600,
                color: textColor,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 'inherit',
              }}
              title="Open timeline and notes"
            >
              {lead.firstName} {lead.lastName}
            </button>
            {isFolded && <StatusBadge variant="accent">{inquiryCount} inquiries</StatusBadge>}
            <LeadBadges lead={lead} showArchiveReason={Boolean(lead.archivedAt)} />
          </div>
          <div style={{ fontSize: '13px', color: mutedText, marginTop: '4px' }}>
            {lead.email}
            {lead.phone ? ` · ${lead.phone}` : ''}
          </div>
          {detail && <div style={{ fontSize: '12px', color: textColor, marginTop: '4px' }}>{detail}</div>}
        </div>

        <LeadRowActions
          lead={lead}
          tab={tab}
          borderColor={borderColor}
          cardBg={cardBg}
          mutedText={mutedText}
          handlers={handlers}
        />
      </div>

      {isFolded && expanded && (
        <div id={subRowsId} role="region" aria-label={`Other inquiries for ${lead.email}`}>
          {folded.others.map((otherLead) => (
            <LeadInquirySubRow
              key={otherLead.id}
              lead={otherLead}
              tab={tab}
              borderColor={borderColor}
              cardBg={cardBg}
              textColor={textColor}
              mutedText={mutedText}
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
