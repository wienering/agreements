import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';

export function GalleryReadyPreviewModal({
  preview,
  sending,
  onClose,
  onSend,
}: {
  preview: { subject: string; html: string; canSend: boolean; sendBlockedReason?: string } | null;
  sending: boolean;
  onClose: () => void;
  onSend: () => void;
}) {
  if (!preview) return null;
  return (
    <ModalFrame maxWidthClass="max-w-[900px]" paddingClass="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-2xl font-bold text-admin-text">
          <span className="inline-flex items-center gap-2.5">
            <UIcon name="camera" className="text-2xl" />
            Gallery Ready Email Preview
          </span>
        </h2>
        <button type="button" onClick={onClose} title="Close preview" className="text-2xl text-admin-text">
          ×
        </button>
      </div>
      {!preview.canSend && preview.sendBlockedReason && (
        <div className="mb-4 rounded border border-warn bg-admin-surface-raised px-4 py-3 text-sm text-admin-text">
          <strong>Cannot send yet:</strong> {preview.sendBlockedReason}
        </div>
      )}
      {preview.canSend && preview.subject && (
        <>
          <div className="mb-4 text-sm text-admin-text">
            <strong>Subject:</strong> {preview.subject}
          </div>
          <iframe
            title="Gallery ready email preview"
            srcDoc={preview.html}
            sandbox=""
            className="h-[520px] w-full rounded border border-admin-hairline bg-white"
          />
        </>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <AdminButton variant="ghost" onClick={onClose}>Close</AdminButton>
        <AdminButton variant="primary" onClick={onSend} disabled={!preview.canSend || sending}>
          {sending ? 'Sending...' : 'Send Email'}
        </AdminButton>
      </div>
    </ModalFrame>
  );
}
