import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';
import type { Agreement } from './types';
import { modalActionsClass, raisedPanelClass } from './uiClasses';

export function PaymentWarningModal({
  agreement,
  saving,
  onCancel,
  onConfirm,
}: {
  agreement: Agreement | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!agreement) return null;
  return (
    <ModalFrame maxWidthClass="max-w-[500px]">
      <h3 className="m-0 mb-4 flex items-center gap-2 text-lg text-admin-text">
        <UIcon name="circle-exclamation" className="text-xl text-warn" />
        Payment Warning
      </h3>
      <p className="mb-4 mt-0 text-base leading-normal text-admin-text">
        You are about to mark this agreement as <strong>COMPLETED</strong>, but the payment status is not fully paid.
      </p>
      <div className={`mb-4 ${raisedPanelClass}`}>
        <p className="mb-2 mt-0 text-sm font-semibold text-admin-text">Agreement Details:</p>
        <p className="mb-1 mt-0 text-sm text-admin-text"><strong>Client:</strong> {agreement.client.firstName} {agreement.client.lastName}</p>
        <p className="mb-1 mt-0 text-sm text-admin-text"><strong>Template:</strong> {agreement.template.title}</p>
        <p className="m-0 text-sm text-admin-text">
          <strong>Current Payment Status:</strong> <span className="font-semibold text-warn">{agreement.paymentStatus || 'Not Set'}</span>
        </p>
      </div>
      <p className="mb-6 mt-0 text-sm leading-normal text-admin-text">Are you sure you want to proceed with marking this agreement as completed?</p>
      <div className={modalActionsClass}>
        <AdminButton variant="ghost" onClick={onCancel}>Cancel</AdminButton>
        <AdminButton variant="primary" onClick={onConfirm} disabled={saving}>
          {saving ? 'Completing...' : 'Yes, Complete Anyway'}
        </AdminButton>
      </div>
    </ModalFrame>
  );
}
