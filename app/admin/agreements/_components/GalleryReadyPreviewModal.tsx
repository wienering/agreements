import { useEffect, useState } from 'react';
import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';

type Tab = 'gallery' | 'review';

export function GalleryReadyPreviewModal({
  preview,
  sending,
  onClose,
  onSend,
}: {
  preview: {
    subject: string;
    html: string;
    canSend: boolean;
    sendBlockedReason?: string;
    alreadySent?: boolean;
    dryRun?: boolean;
    review?: { subject: string; html: string } | null;
  } | null;
  sending: boolean;
  onClose: () => void;
  onSend: () => void;
}) {
  const [tab, setTab] = useState<Tab>('gallery');
  useEffect(() => {
    if (preview) setTab('gallery');
  }, [preview]);

  if (!preview) return null;

  const tabClass = (active: boolean) =>
    `rounded border px-3 py-1.5 text-[13px] font-medium ${
      active ? 'border-accent bg-accent-wash text-accent' : 'border-admin-hairline bg-admin-surface-raised text-admin-muted'
    }`;

  return (
    <ModalFrame maxWidthClass="max-w-[900px]" paddingClass="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 text-2xl font-bold text-admin-text">
          <span className="inline-flex items-center gap-2.5">
            <UIcon name="camera" className="text-2xl" />
            Follow-up Email Preview
          </span>
        </h2>
        <button type="button" onClick={onClose} title="Close preview" className="text-2xl text-admin-text">
          ×
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={tabClass(tab === 'gallery')} onClick={() => setTab('gallery')}>
          Gallery email
        </button>
        {preview.review && (
          <button type="button" className={tabClass(tab === 'review')} onClick={() => setTab('review')}>
            Review request (3 days later)
          </button>
        )}
      </div>

      {tab === 'gallery' && (
        <>
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
        </>
      )}

      {tab === 'review' && preview.review && (
        <>
          <div className="mb-1 text-sm text-admin-text">
            <strong>Subject:</strong> {preview.review.subject}
          </div>
          <p className="m-0 mb-4 text-xs text-admin-muted">
            Sent automatically at 10am, 3 days after the gallery email, unless follow-ups are paused or the client has
            already reviewed. Uses the Ontario review link.
          </p>
          <iframe
            title="Review request email preview"
            srcDoc={preview.review.html}
            sandbox=""
            className="h-[520px] w-full rounded border border-admin-hairline bg-white"
          />
        </>
      )}

      {preview.dryRun && (
        <p className="m-0 mt-4 text-xs font-medium text-warn">
          Preview environment: sending here is a dry run and nothing reaches the client.
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <AdminButton variant="ghost" onClick={onClose}>Close</AdminButton>
        {tab === 'gallery' && (
          <AdminButton variant="primary" onClick={onSend} disabled={!preview.canSend || sending}>
            {sending ? 'Sending...' : preview.alreadySent ? 'Resend' : 'Send now'}
          </AdminButton>
        )}
      </div>
    </ModalFrame>
  );
}
