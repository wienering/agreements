import { UIcon } from '@/app/components/UIcon';

type EmailVerificationProps = {
  email: string;
  onEmailChange: (value: string) => void;
  error: string | null;
  isVerifying: boolean;
  onCancel: () => void;
  onVerify: () => void;
};

export function EmailVerification({
  email,
  onEmailChange,
  error,
  isVerifying,
  onCancel,
  onVerify,
}: EmailVerificationProps) {
  const cannotSubmit = isVerifying || !email.trim();

  return (
    <div className="fixed inset-0 z-[999999] flex h-screen w-screen items-center justify-center bg-black/80">
      <div className="w-[90%] max-w-[500px] rounded border border-hairline bg-panel p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent text-2xl">
            <UIcon name="lock" className="text-2xl text-accent-on" />
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-ink">Email Verification Required</h2>
          <p className="text-base leading-normal text-muted">
            Please enter the email address associated with this agreement to continue.
          </p>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-ink">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !cannotSubmit) {
                onVerify();
              }
            }}
            className="w-full rounded border-2 border-hairline bg-white p-4 text-base text-ink outline-none transition-colors focus:border-accent"
            placeholder="Enter your email address"
          />
        </div>

        {error && (
          <div className="mb-4 rounded border border-alert bg-panel p-3 text-sm text-alert">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded border border-hairline bg-transparent px-6 py-3 text-sm font-medium text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onVerify}
            disabled={cannotSubmit}
            className={`rounded border-none px-6 py-3 text-sm font-semibold ${
              cannotSubmit
                ? 'cursor-not-allowed bg-hairline text-muted'
                : 'cursor-pointer bg-accent text-accent-on'
            } ${isVerifying ? 'opacity-70' : ''}`}
          >
            {isVerifying ? 'Verifying...' : 'Verify Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
