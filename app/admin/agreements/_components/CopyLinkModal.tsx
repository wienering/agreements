import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';
import type { Agreement } from './types';

export function CopyLinkModal({
  agreement,
  onClose,
  showToast,
}: {
  agreement: Agreement | null;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  if (!agreement) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <ModalFrame onBackdropClick={onClose}>
      <h3 className="m-0 mb-4 flex items-center gap-2 text-lg text-admin-text">
        <UIcon name="file" className="text-lg" />
        View Agreement
      </h3>
      <p className="mb-5 mt-0 text-sm text-admin-muted">Choose how to view or share this agreement</p>
      <div className="flex flex-col gap-3">
        <AdminButton
          variant="ghost"
          fullWidth
          onClick={() => {
            window.open(`${origin}/admin/preview/${agreement.uniqueToken}`, '_blank');
            onClose();
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UIcon name="lock" className="text-sm" />
            Admin View
          </span>
        </AdminButton>
        <AdminButton
          variant="ghost"
          fullWidth
          onClick={() => {
            window.open(`${origin}/agreement/${agreement.uniqueToken}`, '_blank');
            onClose();
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UIcon name="eye" className="text-sm" />
            Client View
          </span>
        </AdminButton>
        <AdminButton
          variant="primary"
          fullWidth
          onClick={() => {
            navigator.clipboard.writeText(`${origin}/agreement/${agreement.uniqueToken}`).then(() => {
              showToast('Link copied to clipboard!', 'success');
              onClose();
            }).catch(() => showToast('Failed to copy link', 'error'));
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UIcon name="clipboard" className="text-sm" />
            Copy Client Link
          </span>
        </AdminButton>
        <AdminButton variant="ghost" fullWidth onClick={onClose}>
          Cancel
        </AdminButton>
      </div>
    </ModalFrame>
  );
}
