import { AdminButton } from '../../../components/AdminButton';
import { UIcon } from '../../../components/UIcon';
import { ModalFrame } from './ModalFrame';
import { ToggleSwitch } from './ToggleSwitch';
import type { Agreement } from './types';
import { raisedPanelClass } from './uiClasses';

export function AttendantModal({
  agreement,
  updatingPhone,
  updatingGreenScreen,
  onClose,
  onTogglePhone,
  onToggleGreenScreen,
  showToast,
}: {
  agreement: Agreement | null;
  updatingPhone: boolean;
  updatingGreenScreen: boolean;
  onClose: () => void;
  onTogglePhone: (agreement: Agreement) => void;
  onToggleGreenScreen: (agreement: Agreement) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  if (!agreement) return null;
  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/attendant/${agreement.id}`;

  return (
    <ModalFrame onBackdropClick={onClose}>
      <h3 className="m-0 mb-4 flex items-center gap-2 text-lg text-admin-text">
        <UIcon name="users" className="text-lg" />
        Attendant View Options
      </h3>
      <p className="mb-5 mt-0 text-sm text-admin-muted">Choose an action for the attendant view page</p>
      <div className={`mb-5 p-4 ${raisedPanelClass}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-admin-text">
            <UIcon name="phone-call" className="text-sm" />
            Always Show Phone Number
          </span>
          <ToggleSwitch
            on={Boolean(agreement.showPhoneNumberAlways)}
            disabled={updatingPhone}
            onClick={() => onTogglePhone(agreement)}
            label="Always Show Phone Number"
          />
        </div>
        <p className="m-0 text-xs text-admin-muted">
          {agreement.showPhoneNumberAlways
            ? 'Phone number will be visible on the attendant page regardless of event time'
            : 'Phone number will only be visible 24 hours before the event starts (default)'}
        </p>
      </div>
      <div className={`mb-5 p-4 ${raisedPanelClass}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-admin-text">
            <UIcon name="video-camera" className="text-sm" />
            Force Virtual Green Screen
          </span>
          <ToggleSwitch
            on={Boolean(agreement.forceVirtualGreenScreen)}
            disabled={updatingGreenScreen}
            onClick={() => onToggleGreenScreen(agreement)}
            label="Force Virtual Green Screen"
          />
        </div>
        <p className="m-0 text-xs text-admin-muted">
          {agreement.forceVirtualGreenScreen
            ? 'Virtual Green Screen will override the selected backdrop on the attendant page'
            : 'Backdrop selection will behave normally (no override)'}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="w-full rounded border-0 bg-accent px-6 py-3 text-sm font-medium text-accent-on"
          onClick={() => {
            navigator.clipboard.writeText(link).then(() => {
              showToast('Link copied to clipboard!', 'success');
              onClose();
            }).catch(() => showToast('Failed to copy link', 'error'));
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UIcon name="clipboard" className="text-sm" />
            Copy Link
          </span>
        </button>
        <button
          type="button"
          className="w-full rounded border-0 bg-accent px-6 py-3 text-sm font-medium text-accent-on"
          onClick={() => {
            window.open(link, '_blank');
            onClose();
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <UIcon name="eye" className="text-sm" />
            View Page
          </span>
        </button>
        <AdminButton variant="ghost" fullWidth onClick={onClose}>
          Cancel
        </AdminButton>
      </div>
    </ModalFrame>
  );
}
