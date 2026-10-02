import { UIcon } from '../UIcon';
import { BrandMark } from './BrandMark';

type AttendantUnavailableProps = {
  variant: 'expired' | 'missing';
};

const screens = {
  expired: {
    icon: 'clock',
    tone: 'bg-warn',
    title: 'Event Information Expired',
    message:
      'This event information is no longer available. Event details are only accessible up to 24 hours after the event date and time.',
    iconTitle: undefined,
  },
  missing: {
    icon: 'circle-exclamation',
    tone: 'bg-alert',
    title: 'Event Details Not Found',
    message:
      'We could not find the event details for the provided link. The link may be incorrect or the event may have been removed.',
    iconTitle: 'Warning',
  },
} as const;

export function AttendantUnavailable({ variant }: AttendantUnavailableProps) {
  const screen = screens[variant];

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-bg p-8 font-ui text-admin-text">
      <div className="max-w-[520px] rounded-sm border border-admin-hairline bg-admin-surface p-12 text-center">
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-sm text-[28px] ${screen.tone}`}
        >
          <UIcon name={screen.icon} className="text-[28px] text-accent-on" title={screen.iconTitle} />
        </div>
        <h1 className="admin-page-title m-0 mb-4 text-2xl !font-bold text-admin-text">{screen.title}</h1>
        <p className="m-0 mb-6 text-base leading-[1.6] text-admin-muted">{screen.message}</p>
        <div className="mb-6 rounded-sm border border-admin-hairline bg-admin-bg p-4">
          <p className="m-0 text-sm leading-[1.6] text-admin-muted">
            {variant === 'expired' ? (
              <>
                If you need access to this information, please contact{' '}
                <strong className="font-semibold text-accent">info@photoboothguys.ca</strong>
              </>
            ) : (
              <>
                Please contact us at{' '}
                <strong className="font-semibold text-accent">info@photoboothguys.ca</strong> if you believe this is
                an error.
              </>
            )}
          </p>
        </div>
        <div className="border-t border-admin-hairline pt-6">
          <BrandMark
            size="notice"
            extra={
              variant === 'missing' ? (
                <a href="tel:+16473785332" className="ml-3 text-sm text-accent no-underline">
                  647-378-5332
                </a>
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
