import { formatDateTimeToronto } from '@/lib/dates';
import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';
import type { Agreement } from './types';
import { fieldClass, labelClass, modalActionsClass } from './uiClasses';

export function CancelModal({
  agreement,
  step,
  reason,
  adminName,
  confirmation,
  cancelling,
  onReason,
  onAdminName,
  onConfirmation,
  onStep,
  onClose,
  onStep1,
  onStep2,
  onStep3,
  onConfirm,
}: {
  agreement: Agreement | null;
  step: number;
  reason: string;
  adminName: string;
  confirmation: string;
  cancelling: boolean;
  onReason: (value: string) => void;
  onAdminName: (value: string) => void;
  onConfirmation: (value: string) => void;
  onStep: (step: number) => void;
  onClose: () => void;
  onStep1: () => void;
  onStep2: () => void;
  onStep3: () => void;
  onConfirm: () => void;
}) {
  if (!agreement) return null;
  return (
    <ModalFrame maxWidthClass="max-w-[500px]">
      <h3 className="m-0 mb-4 flex items-center gap-2 text-lg text-admin-text">
        <UIcon name="circle-exclamation" className="text-xl text-alert" />
        Cancel Agreement - Step {step} of 4
      </h3>
      {step === 1 && (
        <div>
          <p className="mb-4 mt-0 text-admin-text">
            <strong>Client:</strong> {agreement.client.firstName} {agreement.client.lastName}
            <br />
            <strong>Template:</strong> {agreement.template.title}
            <br />
            <strong>Signed:</strong> {agreement.signedAt ? formatDateTimeToronto(agreement.signedAt) : 'N/A'}
          </p>
          <label className={labelClass}>Reason for Cancellation *</label>
          <textarea
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            placeholder="Please provide a detailed reason for cancelling this agreement..."
            className={`${fieldClass} mb-4 min-h-[100px] resize-y`}
          />
          <div className={modalActionsClass}>
            <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={onStep1}>Continue</AdminButton>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <p className="mb-4 mt-0 text-admin-text">
            <strong>Reason:</strong> {reason}
          </p>
          <label className={labelClass}>Your Name (Admin) *</label>
          <input type="text" value={adminName} placeholder="Enter your full name" onChange={(event) => onAdminName(event.target.value)} className={`${fieldClass} mb-4`} />
          <div className={modalActionsClass}>
            <AdminButton variant="ghost" onClick={() => onStep(1)}>Back</AdminButton>
            <AdminButton variant="danger" onClick={onStep2}>Continue</AdminButton>
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <div className="mb-4 rounded border border-alert bg-admin-surface-raised p-4">
            <h4 className="m-0 mb-2 flex items-center gap-2 text-alert">
              <UIcon name="circle-exclamation" className="text-lg" />
              Final Confirmation Required
            </h4>
            <p className="m-0 text-sm text-alert">
              This action will permanently cancel the agreement, move it to the archived section, and notify the client via email. This cannot be undone.
            </p>
          </div>
          <p className="mb-4 mt-0 text-admin-text">
            <strong>Client:</strong> {agreement.client.firstName} {agreement.client.lastName}
            <br />
            <strong>Template:</strong> {agreement.template.title}
            <br />
            <strong>Reason:</strong> {reason}
            <br />
            <strong>Cancelled by:</strong> {adminName}
          </p>
          <label className={labelClass}>Type &quot;CANCEL AGREEMENT&quot; to confirm *</label>
          <input
            type="text"
            value={confirmation}
            placeholder="CANCEL AGREEMENT"
            onChange={(event) => onConfirmation(event.target.value)}
            className={`${fieldClass} mb-4 font-mono`}
          />
          <div className={modalActionsClass}>
            <AdminButton variant="ghost" onClick={() => onStep(2)}>Back</AdminButton>
            <AdminButton variant="danger" onClick={onStep3}>Continue</AdminButton>
          </div>
        </div>
      )}
      {step === 4 && (
        <div>
          <div className="mb-4 rounded border-2 border-alert bg-admin-surface-raised p-5 text-center">
            <h4 className="m-0 mb-2 flex items-center justify-center gap-2 text-lg text-alert">
              <UIcon name="siren" className="text-xl" />
              FINAL WARNING
            </h4>
            <p className="m-0 text-base font-medium text-alert">
              You are about to permanently cancel this signed agreement. It will be moved to the archived section.
            </p>
          </div>
          <div className="mb-4 rounded border border-admin-hairline bg-admin-surface p-4">
            <h5 className="m-0 mb-2 text-admin-text">Agreement Details:</h5>
            <p className="m-0 mb-1 text-sm text-admin-text"><strong>Client:</strong> {agreement.client.firstName} {agreement.client.lastName}</p>
            <p className="m-0 mb-1 text-sm text-admin-text"><strong>Email:</strong> {agreement.client.email}</p>
            <p className="m-0 mb-1 text-sm text-admin-text"><strong>Template:</strong> {agreement.template.title}</p>
            <p className="m-0 mb-1 text-sm text-admin-text"><strong>Signed:</strong> {agreement.signedAt ? formatDateTimeToronto(agreement.signedAt) : 'N/A'}</p>
            <p className="m-0 mb-1 text-sm text-admin-text"><strong>Reason:</strong> {reason}</p>
            <p className="m-0 text-sm text-admin-text"><strong>Cancelled by:</strong> {adminName}</p>
          </div>
          <div className={modalActionsClass}>
            <AdminButton variant="ghost" onClick={() => onStep(3)}>Back</AdminButton>
            <AdminButton variant="danger" onClick={onConfirm} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'CANCEL AGREEMENT'}
            </AdminButton>
          </div>
        </div>
      )}
    </ModalFrame>
  );
}
