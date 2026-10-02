import { formatDateToronto } from '@/lib/dates';
import { AdminButton } from '../../../components/AdminButton';
import { StatusBadge, agreementStatusToBadgeVariant } from '../../../components/StatusBadge';
import {
  agreementMissingAttendant,
  getAgreementAttendantName,
} from './agreementUtils';
import { hideEngagementTooltip, showEngagementTooltip } from './engagementTooltip';
import { NoAttendantHint } from './NoAttendantHint';
import { ReviewStamp, type RowActions } from './AgreementRow';
import type { Agreement } from './types';
import { UnreadNotesBadge } from './UnreadNotesBadge';

export function CompletedAgreementCard({ agreement, actions }: { agreement: Agreement; actions: RowActions }) {
  const attendantName = getAgreementAttendantName(agreement);
  const missingAttendant = agreementMissingAttendant(agreement);
  const eventDate = agreement.event?.eventDate || agreement.client.eventDate;

  return (
    <div className="relative rounded border border-admin-hairline bg-admin-surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="relative">
          <h3 className="relative m-0 text-lg text-admin-text" title="Hover for agreement name and email">
            <span className="inline-flex items-center gap-2">
              <span
                className="cursor-pointer"
                onMouseEnter={(event) => showEngagementTooltip(event.currentTarget, agreement)}
                onMouseLeave={hideEngagementTooltip}
              >
                {agreement.client.firstName} {agreement.client.lastName}
              </span>
              <UnreadNotesBadge count={agreement.unreadNotesCount ?? 0} />
            </span>
          </h3>
          {attendantName ? (
            <div className="mt-1 text-xs text-admin-muted">Attendant: {attendantName}</div>
          ) : missingAttendant ? (
            <div className="mt-1">
              <NoAttendantHint />
            </div>
          ) : null}
        </div>
        <StatusBadge variant={agreementStatusToBadgeVariant(agreement.status)}>{agreement.status}</StatusBadge>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <span className="text-xs text-admin-muted">Template</span>
          <p className="m-0 mt-1 text-sm text-admin-text">{agreement.template.title}</p>
        </div>
        <div>
          <span className="text-xs text-admin-muted">Event Date</span>
          <p className="m-0 mt-1 text-sm text-admin-text">{eventDate ? formatDateToronto(eventDate) : 'Not set'}</p>
        </div>
        <div>
          <span className="text-xs text-admin-muted">Signed</span>
          <p className="m-0 mt-1 text-sm text-admin-text">
            {agreement.signedAt ? formatDateToronto(agreement.signedAt) : 'Not signed'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AdminButton variant="ghost" onClick={() => actions.onView(agreement)}>
          View Agreement
        </AdminButton>
        <AdminButton variant="ghost" onClick={() => actions.onEdit(agreement)}>
          Edit Details
        </AdminButton>
        {!agreement.reviewRequestSentAt ? (
          <AdminButton
            variant="ghost"
            onClick={() => actions.onReview(agreement)}
            disabled={actions.sendingReviewRequest[agreement.id] || !agreement.client.email}
            title={!agreement.client.email ? 'Client email is required' : 'Send client an email to request a Google review'}
          >
            {actions.sendingReviewRequest[agreement.id] ? 'Sending...' : 'Request Google Review'}
          </AdminButton>
        ) : (
          <ReviewStamp sentAt={agreement.reviewRequestSentAt} />
        )}
        <AdminButton
          variant="danger"
          onClick={() => actions.onArchive(agreement.id)}
          disabled={actions.archivingAgreement[agreement.id]}
          title="Archive this completed agreement"
        >
          {actions.archivingAgreement[agreement.id] ? 'Archiving...' : 'Archive'}
        </AdminButton>
      </div>
    </div>
  );
}
