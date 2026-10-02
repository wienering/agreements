import { AdminButton } from '../../../components/AdminButton';
import { ModalFrame, ModalTitle } from './ModalFrame';
import { fieldClass, labelClass, modalActionsClass } from './uiClasses';

export function ResendExpirationModal({
  open,
  value,
  busy,
  onChange,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <ModalFrame>
      <ModalTitle>Agreement Expired</ModalTitle>
      <p className="mb-4 mt-0 text-sm text-admin-muted">This agreement has expired. Choose a new expiration date before resending.</p>
      <label className={labelClass}>New Expiration Date</label>
      <input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mb-4`} />
      <div className={modalActionsClass}>
        <AdminButton variant="ghost" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton variant="primary" onClick={onConfirm} disabled={busy}>
          {busy ? 'Updating...' : 'Update & Resend'}
        </AdminButton>
      </div>
    </ModalFrame>
  );
}
