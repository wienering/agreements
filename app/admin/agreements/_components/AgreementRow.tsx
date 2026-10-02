import { formatDateTimeToronto, formatDateToronto, torontoCalendarDaysBetween } from '@/lib/dates';
import { buildAgreementStatusHint } from '@/lib/agreementTrackingUi';
import { AdminButton } from '../../../components/AdminButton';
import { StatusBadge, agreementStatusToBadgeVariant, paymentStatusToBadgeVariant } from '../../../components/StatusBadge';
import { UIcon } from '../../../components/UIcon';
import {
  agreementMissingAttendant,
  formatEventRelative,
  formatEventRelativeCompact,
  getAgreementAttendantName,
} from './agreementUtils';
import { hideEngagementTooltip, showEngagementTooltip } from './engagementTooltip';
import { NoAttendantHint } from './NoAttendantHint';
import { ConflictList, DoubleBookingBadge } from './DoubleBookingBadge';
import type { Agreement, AttendantConflict } from './types';
import { UnreadNotesBadge } from './UnreadNotesBadge';
import { hintTextClass } from './uiClasses';

export interface RowActions {
  onEdit: (agreement: Agreement) => void;
  onInvoice: (agreement: Agreement) => void;
  onView: (agreement: Agreement) => void;
  onAttendant: (agreement: Agreement) => void;
  onResend: (agreement: Agreement) => void;
  onReview: (agreement: Agreement) => void;
  onSend: (agreement: Agreement) => void;
  onDelete: (id: string) => void;
  onCancel: (agreement: Agreement) => void;
  onArchive: (id: string) => void;
  onEditStatus: (agreement: Agreement) => void;
  onEditExpiry: (agreement: Agreement) => void;
  sendingToClient: Record<string, boolean>;
  sendingReviewRequest: Record<string, boolean>;
  deletingAgreement: Record<string, boolean>;
  archivingAgreement: Record<string, boolean>;
}

function warningBorderClass(warningType: string | null) {
  if (warningType === 'expiration' || warningType === 'critical') return 'border-[3px] border-alert';
  if (warningType === 'warning') return 'border-[3px] border-warn';
  return 'border border-admin-hairline';
}

function WarningIcon({ warningType, className }: { warningType: string; className?: string }) {
  if (warningType === 'expiration') return <UIcon name="clock" className={`text-warn ${className || ''}`} />;
  if (warningType === 'critical') return <UIcon name="siren" className={`text-alert ${className || ''}`} />;
  return <UIcon name="circle-exclamation" className={`text-warn ${className || ''}`} />;
}

export function AgreementRow({
  agreement,
  expanded,
  onToggle,
  warningType,
  conflicts = [],
  actions,
}: {
  agreement: Agreement;
  expanded: boolean;
  onToggle: () => void;
  warningType: string | null;
  conflicts?: AttendantConflict[];
  actions: RowActions;
}) {
  const eventDateRaw = agreement.event?.eventDate || agreement.client.eventDate;
  const eventDateObj = eventDateRaw ? new Date(eventDateRaw) : null;
  const attendantName = getAgreementAttendantName(agreement);
  const missingAttendant = agreementMissingAttendant(agreement);
  const showFollowUpPad =
    agreement.status === 'LIVE' &&
    agreement.lastEmailedAt &&
    torontoCalendarDaysBetween(agreement.lastEmailedAt, new Date()) >= 3;
  const daysSinceEmailed =
    agreement.status === 'LIVE' && agreement.lastEmailedAt
      ? torontoCalendarDaysBetween(agreement.lastEmailedAt, new Date())
      : null;
  const isUnresponsive = daysSinceEmailed !== null && daysSinceEmailed >= 3;
  const needsPersonalFollowUp = daysSinceEmailed !== null && daysSinceEmailed >= 5;
  const statusHint = buildAgreementStatusHint(agreement);

  return (
    <div className={`relative overflow-hidden rounded bg-admin-surface ${warningBorderClass(warningType)}`}>
      {warningType && (
        <div className="absolute right-2 top-2 z-[1] hidden text-base md:block">
          <WarningIcon warningType={warningType} />
        </div>
      )}
      {isUnresponsive && (
        <div
          className={`absolute left-2 top-2 z-[1] flex max-w-[calc(100%-16px)] items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-accent-on ${
            needsPersonalFollowUp ? 'bg-alert' : 'bg-warn'
          }`}
        >
          <UIcon name={needsPersonalFollowUp ? 'siren' : 'circle-exclamation'} className="text-sm" />
          {needsPersonalFollowUp ? 'Needs Personal Follow-up' : 'Might need personal follow-up'}
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className={`flex min-h-14 cursor-pointer select-none flex-nowrap items-start gap-2.5 px-4 md:items-center md:gap-3 ${
          showFollowUpPad ? 'pt-9' : 'pt-3.5'
        } pb-3.5`}
      >
        <UIcon
          name="angle-down"
          className={`mt-1 shrink-0 text-sm text-admin-muted motion-safe:transition-transform motion-safe:duration-200 md:mt-0 ${
            expanded ? '' : '-rotate-90'
          }`}
        />
        <div className="w-[54px] shrink-0 pt-0.5 md:w-[92px] md:pt-0">
          <div className="whitespace-nowrap text-xs font-medium leading-tight text-admin-text md:hidden">
            {eventDateObj ? formatDateToronto(eventDateObj, { month: 'short', day: 'numeric' }, 'en-US') : 'No date'}
          </div>
          <div className="mt-0.5 whitespace-nowrap text-[10px] leading-tight text-admin-muted md:hidden">
            {eventDateObj ? formatEventRelativeCompact(eventDateObj) : '—'}
          </div>
          <div className="hidden text-[13px] font-medium leading-tight text-admin-text md:block">
            {eventDateObj
              ? formatDateToronto(eventDateObj, { month: 'short', day: 'numeric', year: 'numeric' }, 'en-US')
              : 'No date'}
          </div>
          <div className="mt-0.5 hidden text-[11px] leading-tight text-admin-muted md:block">
            {eventDateObj ? formatEventRelative(eventDateObj) : '—'}
          </div>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className={`text-sm font-medium text-admin-text ${expanded ? 'whitespace-normal break-words' : 'truncate'}`}>
            <span className={`items-center gap-2 ${expanded ? 'inline' : 'inline-flex max-w-full'}`}>
              <span
                className={`cursor-pointer ${expanded ? '' : 'truncate'}`}
                onMouseEnter={(event) => showEngagementTooltip(event.currentTarget, agreement)}
                onMouseLeave={hideEngagementTooltip}
              >
                {agreement.client.firstName} {agreement.client.lastName}
              </span>
              <UnreadNotesBadge count={agreement.unreadNotesCount ?? 0} />
            </span>
          </div>
          {(attendantName || missingAttendant) && (
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              {attendantName ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
                  <span className="min-w-0 truncate text-xs text-admin-muted">Attendant: {attendantName}</span>
                  <DoubleBookingBadge conflicts={conflicts} />
                </div>
              ) : (
                <div className="min-w-0 flex-1 md:flex-none">
                  <NoAttendantHint />
                </div>
              )}
              <div
                className={`max-w-[45%] truncate whitespace-nowrap text-[11px] leading-snug md:hidden ${hintTextClass(statusHint.urgency, statusHint.warn)}`}
                title={statusHint.text}
              >
                {statusHint.text}
              </div>
            </div>
          )}
          {!attendantName && !missingAttendant && (
            <div
              className={`mt-0.5 truncate whitespace-nowrap text-[11px] leading-snug md:hidden ${hintTextClass(statusHint.urgency, statusHint.warn)}`}
              title={statusHint.text}
            >
              {statusHint.text}
            </div>
          )}
        </div>
        <div className="hidden min-w-[120px] max-w-[220px] shrink overflow-hidden text-right md:block">
          <div className={`truncate text-[11px] leading-snug ${hintTextClass(statusHint.urgency, statusHint.warn)}`} title={statusHint.text}>
            {statusHint.text}
          </div>
          <div className="mt-0.5 truncate text-[11px] leading-snug text-admin-muted" title={agreement.client.email}>
            {agreement.client.email}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5 md:hidden">
          {warningType && (
            <span className="inline-flex text-sm leading-none">
              <WarningIcon warningType={warningType} />
            </span>
          )}
          {agreement.paymentStatus && (
            <StatusBadge variant={paymentStatusToBadgeVariant(agreement.paymentStatus)} title="Payment status" style={{ fontSize: '10px', padding: '2px 6px', gap: '3px' }}>
              <UIcon name="credit-card" className="text-[10px]" />
              {agreement.paymentStatus}
            </StatusBadge>
          )}
          <span onClick={(event) => event.stopPropagation()} className="inline-flex shrink-0">
            <StatusBadge
              variant={agreementStatusToBadgeVariant(agreement.status)}
              onClick={() => actions.onEditStatus(agreement)}
              title="Click to edit status"
              style={{ fontSize: '10px', padding: '2px 6px', gap: '3px' }}
            >
              {agreement.status}
            </StatusBadge>
          </span>
        </div>
        <span onClick={(event) => event.stopPropagation()} className="hidden shrink-0 md:inline-flex">
          <StatusBadge
            variant={agreementStatusToBadgeVariant(agreement.status)}
            onClick={() => actions.onEditStatus(agreement)}
            title="Click to edit status"
          >
            {agreement.status}
          </StatusBadge>
        </span>
        {agreement.paymentStatus && (
          <span className="hidden md:inline-flex">
            <StatusBadge variant={paymentStatusToBadgeVariant(agreement.paymentStatus)} title="Payment status">
              <UIcon name="credit-card" className="text-xs" />
              {agreement.paymentStatus}
            </StatusBadge>
          </span>
        )}
      </div>
      <div
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-[250ms] motion-safe:ease-in-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="border-t border-admin-hairline px-4 pb-4 pt-3">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-admin-muted">
              <span>Created {formatDateToronto(agreement.createdAt)}</span>
              {agreement.status !== 'SIGNED' && (
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.onEditExpiry(agreement);
                  }}
                  title="Click to edit expiration date"
                  className="cursor-pointer"
                >
                  Expires {formatDateToronto(agreement.expiresAt)}
                </span>
              )}
              {attendantName ? (
                <span className="inline-flex items-center gap-1 font-medium text-accent">
                  <UIcon name="link" className="text-xs" />
                  Attendant: {attendantName}
                </span>
              ) : missingAttendant ? (
                <NoAttendantHint />
              ) : null}
              {agreement.selectedBackdropName && (
                <span className="inline-flex items-center gap-1 font-medium text-accent">
                  <UIcon name="camera" className="text-xs" />
                  Selected Backdrop: {agreement.selectedBackdropName}
                </span>
              )}
            </div>
            {conflicts.length > 0 && (
              <div className="mb-3">
                <ConflictList conflicts={conflicts} />
              </div>
            )}
            <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
              <AdminButton variant="ghost" onClick={() => actions.onEdit(agreement)} title="Edit agreement content">
                Edit
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => actions.onInvoice(agreement)}
                disabled={!agreement.client.email}
                title={!agreement.client.email ? 'Client email is required to create invoice' : 'Create Stripe invoice for this agreement'}
              >
                <span className="inline-flex items-center gap-1.5">
                  <UIcon name="credit-card" className="text-sm" />
                  Create Invoice
                </span>
              </AdminButton>
              <AdminButton
                variant="ghost"
                onClick={() => actions.onView(agreement)}
                title="View agreement options"
              >
                View Agreement
              </AdminButton>
              <AdminButton
                variant="ghost"
                onClick={() => actions.onAttendant(agreement)}
                title="View attendant page (event details for staff)"
              >
                Attendant View
              </AdminButton>
              {(agreement.status === 'LIVE' || agreement.status === 'SIGNED') && agreement.lastEmailedAt && (
                <AdminButton
                  variant="ghost"
                  onClick={() => actions.onResend(agreement)}
                  disabled={actions.sendingToClient[agreement.id]}
                  title={`Resend email to client (Previously sent ${agreement.emailSendCount} time${agreement.emailSendCount > 1 ? 's' : ''})`}
                >
                  {actions.sendingToClient[agreement.id] ? 'Sending...' : 'Resend Email'}
                </AdminButton>
              )}
              {agreement.status === 'COMPLETED' && !agreement.reviewRequestSentAt && (
                <AdminButton
                  variant="ghost"
                  onClick={() => actions.onReview(agreement)}
                  disabled={actions.sendingReviewRequest[agreement.id] || !agreement.client.email}
                  title={!agreement.client.email ? 'Client email is required' : 'Send client an email to request a Google review'}
                >
                  {actions.sendingReviewRequest[agreement.id] ? 'Sending...' : 'Request Google Review'}
                </AdminButton>
              )}
              {agreement.status === 'COMPLETED' && agreement.reviewRequestSentAt && (
                <ReviewStamp sentAt={agreement.reviewRequestSentAt} />
              )}
              {agreement.status === 'DRAFT' && (
                <AdminButton
                  variant="ghost"
                  onClick={() => actions.onSend(agreement)}
                  disabled={actions.sendingToClient[agreement.id]}
                  title="Send agreement to client"
                >
                  {actions.sendingToClient[agreement.id] ? 'Sending...' : 'Send to Client'}
                </AdminButton>
              )}
              {agreement.status === 'DRAFT' && (
                <AdminButton
                  variant="danger"
                  onClick={() => actions.onDelete(agreement.id)}
                  disabled={actions.deletingAgreement[agreement.id]}
                  title="Delete this agreement permanently (only DRAFT agreements can be deleted)"
                >
                  {actions.deletingAgreement[agreement.id] ? 'Deleting...' : 'Delete'}
                </AdminButton>
              )}
              {agreement.status === 'SIGNED' && (
                <AdminButton
                  variant="danger"
                  onClick={() => actions.onCancel(agreement)}
                  title="Cancel this signed agreement (Admin only - requires confirmation)"
                >
                  Cancel Agreement
                </AdminButton>
              )}
              {(agreement.status === 'SIGNED' || agreement.status === 'COMPLETED') && (
                <AdminButton
                  variant="danger"
                  onClick={() => actions.onArchive(agreement.id)}
                  disabled={actions.archivingAgreement[agreement.id]}
                  title="Archive this agreement"
                >
                  {actions.archivingAgreement[agreement.id] ? 'Archiving...' : 'Archive'}
                </AdminButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReviewStamp({ sentAt }: { sentAt: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] text-admin-muted"
      title="Google review request already sent"
    >
      <UIcon name="check" className="text-sm text-success" />
      Review requested{' '}
      {formatDateTimeToronto(sentAt, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  );
}
