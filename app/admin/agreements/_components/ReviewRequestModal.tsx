import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';
import { ToggleSwitch } from './ToggleSwitch';
import type { Agreement } from './types';
import { modalActionsClass, raisedPanelClass } from './uiClasses';

export function ReviewRequestModal({
  agreement,
  useCalgary,
  sending,
  onToggleCalgary,
  onClose,
  onSend,
}: {
  agreement: Agreement | null;
  useCalgary: boolean;
  sending: boolean;
  onToggleCalgary: () => void;
  onClose: () => void;
  onSend: () => void;
}) {
  if (!agreement) return null;
  return (
    <ModalFrame maxWidthClass="max-w-[520px]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-2 text-lg text-admin-text">
          <UIcon name="star" className="text-lg text-warn" />
          Request Google Review
        </h3>
        <button type="button" onClick={onClose} title="Close modal" className="p-1 text-admin-text">
          <UIcon name="x" className="text-xl" />
        </button>
      </div>
      <p className="mb-3 mt-0 text-sm leading-relaxed text-admin-text">
        This sends the &ldquo;A quick favour&rdquo; email asking the client for a Google review. Only one review request is
        ever sent, so the automatic one won&rsquo;t go out after this.
      </p>
      <div className={`mb-5 ${raisedPanelClass}`}>
        <p className="mb-1.5 mt-0 text-[13px] text-admin-text"><strong>Client:</strong> {agreement.client.firstName} {agreement.client.lastName}</p>
        <p className="m-0 text-[13px] text-admin-text"><strong>Email:</strong> {agreement.client.email || 'Not set'}</p>
      </div>
      <div className={`mb-5 px-4 py-3 ${raisedPanelClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 text-sm font-medium text-admin-text">Google listing</div>
            <p className="m-0 text-xs leading-snug text-admin-muted">
              {useCalgary ? 'Email will use the Calgary review link.' : 'Ontario (default). Turn on for Calgary clients.'}
            </p>
          </div>
          <ToggleSwitch
            on={useCalgary}
            disabled={sending}
            onClick={onToggleCalgary}
            label={useCalgary ? 'Use Ontario Google listing' : 'Use Calgary Google listing'}
          />
        </div>
      </div>
      <div className={modalActionsClass}>
        <AdminButton variant="ghost" onClick={onClose} disabled={sending}>Cancel</AdminButton>
        <AdminButton variant="primary" onClick={onSend} disabled={sending || !agreement.client.email}>
          {sending ? 'Sending...' : 'Send Review Request'}
        </AdminButton>
      </div>
    </ModalFrame>
  );
}
