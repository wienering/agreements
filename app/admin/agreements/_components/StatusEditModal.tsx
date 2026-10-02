import { canonicalStatus } from '@/lib/agreementStatus';
import { AdminButton } from '../../../components/AdminButton';
import { ModalFrame, ModalTitle } from './ModalFrame';
import { fieldClass, labelClass, modalActionsClass } from './uiClasses';

const OPTIONS = [
  ['DRAFT', 'Draft - Use while creating the agreement'],
  ['SENT', 'Sent - Use after the agreement has been sent'],
  ['SIGNED', 'Signed - Use after the agreement has been signed'],
  ['COMPLETED', 'Completed - Use once the event is over'],
  ['CANCELLED', 'Cancelled - Only for signed or completed agreements. Sends nothing.'],
] as const;

export function StatusEditModal({
  open,
  status,
  saving,
  onStatusChange,
  onCancel,
  onUpdate,
}: {
  open: boolean;
  status: string;
  saving: boolean;
  onStatusChange: (value: string) => void;
  onCancel: () => void;
  onUpdate: () => void;
}) {
  if (!open) return null;
  return (
    <ModalFrame maxWidthClass="max-w-[400px]">
      <ModalTitle>Edit Agreement Status</ModalTitle>
      <label className={labelClass}>New Status</label>
      <select value={canonicalStatus(status)} onChange={(event) => onStatusChange(event.target.value)} className={`${fieldClass} mb-4`}>
        {OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
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
