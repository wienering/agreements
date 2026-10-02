import { UIcon } from '@/app/components/UIcon';

type AgreementStatusScreenProps = {
  kind: 'loading' | 'error';
  title: string;
  message: string;
  support?: 'client' | 'admin';
  displayTitle?: boolean;
};

export function AgreementStatusScreen({
  kind,
  title,
  message,
  support,
  displayTitle = false,
}: AgreementStatusScreenProps) {
  return (
    <div
      data-surface="client"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper px-6 font-ui"
    >
      {kind === 'loading' ? (
        <>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-hairline border-t-accent" />
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-ink">{title}</h2>
            <p className="text-base text-muted">{message}</p>
          </div>
        </>
      ) : (
        <div className="max-w-[500px] rounded border border-hairline bg-panel p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-panel text-2xl">
            <UIcon name="circle-exclamation" className="text-[28px] text-alert" title="Warning" />
          </div>
          <h1 className={`mb-4 text-2xl font-bold text-ink ${displayTitle ? 'font-display' : ''}`}>
            {title}
          </h1>
          <p className="mb-6 text-base leading-normal text-muted">{message}</p>
          {support && (
            <div className="rounded border border-hairline bg-paper p-4">
              <p className="text-sm text-muted">
                {support === 'client' ? (
                  <>
                    Please contact us at <strong>info@photoboothguys.ca</strong> if you believe this is an error.
                  </>
                ) : (
                  <>Please contact support if you believe this is an error.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
