type EmailCopyModalProps = {
  emailAddress: string;
  onEmailChange: (value: string) => void;
  emailError: string | null;
  isEmailing: boolean;
  displayTitle?: boolean;
  responsive?: boolean;
  onCancel: () => void;
  onSend: () => void;
};

export function EmailCopyModal({
  emailAddress,
  onEmailChange,
  emailError,
  isEmailing,
  displayTitle = false,
  responsive = false,
  onCancel,
  onSend,
}: EmailCopyModalProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div
        className={`w-[90%] max-w-[400px] rounded border border-hairline bg-panel ${
          responsive ? 'max-h-[90vh] overflow-y-auto p-5 md:p-8' : 'p-8'
        }`}
      >
        <h2 className={`mb-6 text-ink ${displayTitle ? 'font-display' : ''} ${responsive ? 'text-lg md:text-xl' : 'text-xl'}`}>
          Email Agreement
        </h2>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-ink">Email Address</label>
          <input
            type="email"
            value={emailAddress}
            onChange={(event) => onEmailChange(event.target.value)}
            className="w-full rounded border border-hairline bg-panel p-3 text-sm text-ink"
            placeholder="Enter email address"
          />
        </div>

        {emailError && (
          <div className="mb-4 rounded border border-alert bg-panel p-3 text-sm text-alert">{emailError}</div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={`cursor-pointer rounded border border-hairline bg-transparent py-3 text-sm text-muted ${
              responsive ? 'w-full px-5 md:w-auto md:px-6' : 'px-6'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={isEmailing}
            className={`rounded border-none bg-accent px-6 py-3 text-sm text-accent-on ${
              isEmailing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            }`}
          >
            {isEmailing ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
