'use client';

import { useEffect, useId, useState } from 'react';
import { AdminButton, AdminLink } from '../../components/AdminButton';
import { StatusBadge } from '../../components/StatusBadge';
import {
  ARCHIVE_REASON_LABELS,
  formatLeadDateBadge,
  getPrimaryLeadAction,
  STAGE_LABELS,
} from '@/lib/leads/display';
import { LeadOverflowMenu } from './LeadOverflowMenu';
import type { FoldedLeadRecord, LeadRecord, ManualArchiveReason } from './types';
import { formatGroupedNumber } from '@/lib/dates';

type LeadRowProps = {
  folded: FoldedLeadRecord;
  forceExpanded?: boolean;
  tab: 'active' | 'archived' | 'all';
  borderColor: string;
  cardBg: string;
  textColor: string;
  mutedText: string;
  markingContactLeadId: string | null;
  nextFollowUp: string;
  onNextFollowUpChange: (value: string) => void;
  onSaveMarkContacted: (lead: LeadRecord) => void;
  onCancelMarkContacted: () => void;
  onCreateAgreement: (lead: LeadRecord) => void;
  onView: (lead: LeadRecord) => void;
  onMarkContacted: (lead: LeadRecord) => void;
  onEdit: (lead: LeadRecord) => void;
  onArchive: (lead: LeadRecord, reason: ManualArchiveReason) => void;
  onRestore: (lead: LeadRecord) => void;
  onDelete: (lead: LeadRecord) => void;
};

function getDateBadgeVariant(group: ReturnType<typeof formatLeadDateBadge>['group']) {
  if (group === 'urgent') return 'warning' as const;
  if (group === 'coming_up') return 'accent' as const;
  return 'neutral' as const;
}

type LeadRowActionsProps = {
  lead: LeadRecord;
  tab: LeadRowProps['tab'];
  borderColor: string;
  cardBg: string;
  mutedText: string;
  onCreateAgreement: (lead: LeadRecord) => void;
  onView: (lead: LeadRecord) => void;
  onMarkContacted: (lead: LeadRecord) => void;
  onEdit: (lead: LeadRecord) => void;
  onArchive: (lead: LeadRecord, reason: ManualArchiveReason) => void;
  onRestore: (lead: LeadRecord) => void;
  onDelete: (lead: LeadRecord) => void;
  showPrimaryAction?: boolean;
};

function LeadRowActions({
  lead,
  tab,
  borderColor,
  cardBg,
  mutedText,
  onCreateAgreement,
  onView,
  onMarkContacted,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  showPrimaryAction = true,
}: LeadRowActionsProps) {
  const isArchived = Boolean(lead.archivedAt);
  const primaryAction = getPrimaryLeadAction(lead);

  return (
    <div className="lead-worklist-actions">
      {showPrimaryAction && primaryAction?.kind === 'create_quote' && (
        <AdminLink href={primaryAction.href} variant="primary" size="compact">
          {primaryAction.label}
        </AdminLink>
      )}
      {showPrimaryAction && primaryAction?.kind === 'create_agreement' && (
        <AdminButton variant="primary" size="compact" onClick={() => onCreateAgreement(lead)}>
          {primaryAction.label}
        </AdminButton>
      )}
      {showPrimaryAction &&
        (primaryAction?.kind === 'view_agreement' || primaryAction?.kind === 'view') && (
          <AdminLink href={primaryAction.href} variant="primary" size="compact">
            {primaryAction.label}
          </AdminLink>
        )}

      <LeadOverflowMenu
        lead={lead}
        isArchived={isArchived || tab === 'archived'}
        borderColor={borderColor}
        cardBg={cardBg}
        mutedText={mutedText}
        onView={onView}
        onMarkContacted={onMarkContacted}
        onEdit={onEdit}
        onArchive={onArchive}
        onRestore={onRestore}
        onDelete={onDelete}
      />
    </div>
  );
}

type LeadMarkContactedFormProps = {
  lead: LeadRecord;
  borderColor: string;
  cardBg: string;
  textColor: string;
  mutedText: string;
  nextFollowUp: string;
  onNextFollowUpChange: (value: string) => void;
  onSaveMarkContacted: (lead: LeadRecord) => void;
  onCancelMarkContacted: () => void;
};

function LeadMarkContactedForm({
  lead,
  borderColor,
  cardBg,
  textColor,
  mutedText,
  nextFollowUp,
  onNextFollowUpChange,
  onSaveMarkContacted,
  onCancelMarkContacted,
}: LeadMarkContactedFormProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: '10px',
      }}
    >
      <label style={{ fontSize: '12px', color: mutedText }}>
        Next follow-up
        <input
          type="date"
          value={nextFollowUp}
          onChange={(event) => onNextFollowUpChange(event.target.value)}
          style={{
            display: 'block',
            marginTop: '4px',
            padding: '6px 8px',
            borderRadius: '2px',
            border: `1px solid ${borderColor}`,
            backgroundColor: cardBg,
            color: textColor,
          }}
        />
      </label>
      <AdminButton variant="primary" size="compact" onClick={() => onSaveMarkContacted(lead)}>
        Save
      </AdminButton>
      <AdminButton variant="ghost" size="compact" onClick={onCancelMarkContacted}>
        Cancel
      </AdminButton>
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
  markingContactLeadId,
  nextFollowUp,
  onNextFollowUpChange,
  onSaveMarkContacted,
  onCancelMarkContacted,
  onCreateAgreement,
  onView,
  onMarkContacted,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: LeadRowProps & { lead: LeadRecord }) {
  const dateBadge = formatLeadDateBadge(lead.eventDate);
  const quoteTotal =
    lead.quoteTotal != null ? `$${formatGroupedNumber(Number(lead.quoteTotal), 'en-CA')}` : null;

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
          <StatusBadge variant="neutral">{STAGE_LABELS[lead.stage] ?? lead.stage}</StatusBadge>
          {!lead.lastContactedAt && !lead.archivedAt && (
            <StatusBadge variant="warning">Never contacted</StatusBadge>
          )}
        </div>
        {quoteTotal && (
          <div style={{ fontSize: '13px', color: textColor, marginTop: '4px' }}>{quoteTotal}</div>
        )}
        {markingContactLeadId === lead.id && (
          <LeadMarkContactedForm
            lead={lead}
            borderColor={borderColor}
            cardBg={cardBg}
            textColor={textColor}
            mutedText={mutedText}
            nextFollowUp={nextFollowUp}
            onNextFollowUpChange={onNextFollowUpChange}
            onSaveMarkContacted={onSaveMarkContacted}
            onCancelMarkContacted={onCancelMarkContacted}
          />
        )}
      </div>

      <LeadRowActions
        lead={lead}
        tab={tab}
        borderColor={borderColor}
        cardBg={cardBg}
        mutedText={mutedText}
        onCreateAgreement={onCreateAgreement}
        onView={onView}
        onMarkContacted={onMarkContacted}
        onEdit={onEdit}
        onArchive={onArchive}
        onRestore={onRestore}
        onDelete={onDelete}
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
  markingContactLeadId,
  nextFollowUp,
  onNextFollowUpChange,
  onSaveMarkContacted,
  onCancelMarkContacted,
  onCreateAgreement,
  onView,
  onMarkContacted,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: LeadRowProps) {
  const lead = folded.primary;
  const isFolded = folded.others.length > 0;
  const inquiryCount = folded.others.length + 1;
  const [expanded, setExpanded] = useState(false);
  const subRowsId = useId();

  useEffect(() => {
    if (forceExpanded) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }, [forceExpanded]);

  const isArchived = Boolean(lead.archivedAt);
  const dateBadge = formatLeadDateBadge(lead.eventDate);
  const quoteTotal =
    lead.quoteTotal != null ? `$${formatGroupedNumber(Number(lead.quoteTotal), 'en-CA')}` : null;

  return (
    <div style={{ borderBottom: `1px solid ${borderColor}` }}>
      <div
        className="lead-worklist-row"
        style={{
          padding: '14px 16px',
          borderBottom: 'none',
        }}
      >
        <div
          aria-label={`Event date: ${dateBadge.primary}, ${dateBadge.secondary}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            alignItems: 'flex-start',
          }}
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
            <span style={{ fontWeight: 600, color: textColor }}>
              {lead.firstName} {lead.lastName}
            </span>
            {isFolded && (
              <StatusBadge variant="accent">{inquiryCount} inquiries</StatusBadge>
            )}
            <StatusBadge variant="neutral">{STAGE_LABELS[lead.stage] ?? lead.stage}</StatusBadge>
            {isArchived && lead.archiveReason && (
              <StatusBadge variant="neutral">
                {ARCHIVE_REASON_LABELS[lead.archiveReason] ?? lead.archiveReason}
              </StatusBadge>
            )}
            {!lead.lastContactedAt && !isArchived && (
              <StatusBadge variant="warning">Never contacted</StatusBadge>
            )}
          </div>
          <div style={{ fontSize: '13px', color: mutedText, marginTop: '4px' }}>{lead.email}</div>
          {quoteTotal && (
            <div style={{ fontSize: '13px', color: textColor, marginTop: '4px' }}>{quoteTotal}</div>
          )}
          {markingContactLeadId === lead.id && (
            <LeadMarkContactedForm
              lead={lead}
              borderColor={borderColor}
              cardBg={cardBg}
              textColor={textColor}
              mutedText={mutedText}
              nextFollowUp={nextFollowUp}
              onNextFollowUpChange={onNextFollowUpChange}
              onSaveMarkContacted={onSaveMarkContacted}
              onCancelMarkContacted={onCancelMarkContacted}
            />
          )}
        </div>

        <LeadRowActions
          lead={lead}
          tab={tab}
          borderColor={borderColor}
          cardBg={cardBg}
          mutedText={mutedText}
          onCreateAgreement={onCreateAgreement}
          onView={onView}
          onMarkContacted={onMarkContacted}
          onEdit={onEdit}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      </div>

      {isFolded && expanded && (
        <div id={subRowsId} role="region" aria-label={`Other inquiries for ${lead.email}`}>
          {folded.others.map((otherLead) => (
            <LeadInquirySubRow
              key={otherLead.id}
              lead={otherLead}
              folded={folded}
              tab={tab}
              borderColor={borderColor}
              cardBg={cardBg}
              textColor={textColor}
              mutedText={mutedText}
              markingContactLeadId={markingContactLeadId}
              nextFollowUp={nextFollowUp}
              onNextFollowUpChange={onNextFollowUpChange}
              onSaveMarkContacted={onSaveMarkContacted}
              onCancelMarkContacted={onCancelMarkContacted}
              onCreateAgreement={onCreateAgreement}
              onView={onView}
              onMarkContacted={onMarkContacted}
              onEdit={onEdit}
              onArchive={onArchive}
              onRestore={onRestore}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
