'use client';

import { useEffect } from 'react';

type SigningModalProps = {
  clientName: string;
  clientEmail: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  signError: string | null;
  hasAgreedToTerms: boolean;
  onAgreedChange: (value: boolean) => void;
  isSigning: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SigningModal({
  clientName,
  clientEmail,
  onNameChange,
  onEmailChange,
  signError,
  hasAgreedToTerms,
  onAgreedChange,
  isSigning,
  onCancel,
  onConfirm,
}: SigningModalProps) {
  const cannotSign = isSigning || !hasAgreedToTerms;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement | null;
      firstInput?.focus();
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="w-[90%] max-w-[400px] rounded border border-hairline bg-panel p-8">
        <h2 className="mb-6 font-display text-xl text-ink">Sign Agreement</h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-ink">Full Name</label>
          <input
            type="text"
            value={clientName}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full rounded border border-hairline bg-white p-4 text-base text-ink outline-none transition-all focus:scale-[1.02] focus:border-accent focus:bg-paper md:p-3 md:text-sm"
            placeholder="Enter your full name"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-ink">Email Address</label>
          <input
            type="email"
            value={clientEmail}
            onChange={(event) => onEmailChange(event.target.value)}
            className="w-full rounded border border-hairline bg-white p-4 text-base text-ink outline-none transition-all focus:scale-[1.02] focus:border-accent focus:bg-paper md:p-3 md:text-sm"
            placeholder="Enter your email address"
          />
        </div>

        {signError && (
          <div className="mb-4 rounded border border-alert bg-panel p-3 text-sm text-alert">{signError}</div>
        )}

        <div className="mb-6">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-normal text-ink">
            <input
              type="checkbox"
              checked={hasAgreedToTerms}
              onChange={(event) => onAgreedChange(event.target.checked)}
              className="mt-0.5 h-[18px] w-[18px] cursor-pointer accent-accent"
            />
            <span>
              I have read and agree to the terms of the agreement. By signing, I acknowledge that I have reviewed the complete agreement and consent to its terms and conditions.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full cursor-pointer rounded border border-hairline bg-transparent px-5 py-3 text-sm text-muted md:w-auto md:px-6"
          >
            Cancel
          </button>
          <div
            title={!hasAgreedToTerms && !isSigning ? 'Please accept the terms and conditions to sign the agreement' : ''}
            className="relative"
          >
            <button
              type="button"
              onClick={onConfirm}
              disabled={cannotSign}
              className={`relative rounded border-none px-6 py-3 text-sm ${
                cannotSign
                  ? 'cursor-not-allowed bg-hairline text-muted'
                  : 'cursor-pointer bg-accent text-accent-on'
              } ${isSigning ? 'opacity-70' : ''}`}
            >
              {isSigning ? 'Signing...' : 'Sign Agreement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
