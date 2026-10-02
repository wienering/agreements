import { AdminButton } from '../../../components/AdminButton';
import { ModalFrame, ModalTitle } from './ModalFrame';
import { fieldClass, labelClass, modalActionsClass } from './uiClasses';

export function ExpirationEditModal({
  open,
  value,
  saving,
  onChange,
  onCancel,
  onUpdate,
}: {
  open: boolean;
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onUpdate: () => void;
}) {
  if (!open) return null;
  return (
    <ModalFrame>
      <ModalTitle>Edit Expiration Date</ModalTitle>
      <label className={labelClass}>New Expiration Date</label>
      <input type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mb-4`} />
      <div className={modalActionsClass}>
        <AdminButton variant="ghost" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton variant="primary" onClick={onUpdate} disabled={saving}>
          {saving ? 'Updating...' : 'Update'}
        </AdminButton>
      </div>
    </ModalFrame>
  );
}
