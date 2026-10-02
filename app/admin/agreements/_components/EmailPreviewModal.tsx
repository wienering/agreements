import { formatDateToronto } from '@/lib/dates';
import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';
import type { Agreement } from './types';
import { eyebrowClass, metaPanelClass } from './uiClasses';

export function EmailPreviewModal({
  agreement,
  onClose,
  onSend,
}: {
  agreement: Agreement | null;
  onClose: () => void;
  onSend: (agreement: Agreement) => void;
}) {
  if (!agreement) return null;
  const expires = formatDateToronto(agreement.expiresAt, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <ModalFrame maxWidthClass="max-w-[800px]" paddingClass="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-2xl font-bold text-admin-text">
          <span className="inline-flex items-center gap-2.5">
            <UIcon name="envelope" className="text-2xl" />
            Email Preview
          </span>
        </h2>
        <button type="button" onClick={onClose} className="p-1 text-admin-text">
          <UIcon name="x" className="text-[22px]" />
        </button>
      </div>
      <div className={`mb-6 ${metaPanelClass} p-6`}>
        <h3 className="m-0 mb-4 text-lg font-semibold text-admin-text">Email Details</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <Info label="To" value={agreement.client.email} />
          <Info label="Client Name" value={`${agreement.client.firstName} ${agreement.client.lastName}`} />
          <Info label="Expires" value={expires} />
          <Info label="Template" value={agreement.template.title} />
        </div>
      </div>
      <div className={`mb-6 ${metaPanelClass} p-6`}>
        <h3 className="m-0 mb-4 text-lg font-semibold text-admin-text">Email Content Preview</h3>
        <div className="rounded border border-admin-hairline bg-admin-surface p-5 font-sans text-sm leading-relaxed text-admin-text">
          <div className="mb-4">
            <strong>Subject:</strong> Your Photo Booth Agreement - {agreement.client.firstName} {agreement.client.lastName}
          </div>
          <div className="mb-4">
            <strong>From:</strong> Photobooth Guys &lt;info@photoboothguys.ca&gt;
          </div>
          <div className="mt-4 border-t border-admin-hairline pt-4">
            <p className="mb-3 mt-0">Hi {agreement.client.firstName},</p>
            <p className="mb-3 mt-0">Your photo booth agreement is ready for review and signature. Please click the link below to view and sign your agreement.</p>
            <div className="my-3 inline-block rounded bg-accent px-6 py-3 font-semibold text-accent-on">View & Sign Agreement →</div>
            <p className="mb-0 mt-3 text-xs text-admin-muted">This agreement expires on {expires}.</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <AdminButton variant="ghost" onClick={onClose}>Close</AdminButton>
        <AdminButton
          variant="primary"
          onClick={() => {
            onClose();
            onSend(agreement);
          }}
        >
          Send Email
        </AdminButton>
      </div>
    </ModalFrame>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className={eyebrowClass}>{label}</label>
      <p className="m-0 text-sm font-medium text-admin-text">{value}</p>
    </div>
  );
}
