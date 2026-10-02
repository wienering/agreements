import { UIcon } from '@/app/components/UIcon';

export function SignSuccessOverlay({ message }: { message: string }) {
  return (
    <div className="agreement-fade-in fixed inset-0 z-[999999] flex items-center justify-center bg-black/80">
      <div className="agreement-slide-in w-[90%] max-w-[400px] rounded border border-hairline bg-panel p-10 text-center">
        <div className="agreement-checkmark mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success text-[32px] text-accent-on">
          <UIcon name="check" className="text-[32px] text-accent-on" title="Success" />
        </div>
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">Success!</h2>
        <p className="mb-6 text-base leading-normal text-muted">{message}</p>
        <div className="rounded border border-hairline bg-paper p-4 text-sm text-muted">
          <p>Your agreement is now legally binding and has been securely stored.</p>
        </div>
      </div>
    </div>
  );
}
