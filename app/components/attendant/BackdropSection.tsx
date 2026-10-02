import { UIcon } from '../UIcon';

type BackdropSectionProps = {
  name: string | null;
  thumbnailUrl?: string | null;
  forceVirtualGreenScreen?: boolean;
  variant?: 'detail' | 'inline';
  /** Compact hub cards use a muted icon; the featured card inherits the accent color. */
  iconTone?: 'accent' | 'muted';
};

export function BackdropSection({
  name,
  thumbnailUrl = null,
  forceVirtualGreenScreen = false,
  variant = 'detail',
  iconTone = 'accent',
}: BackdropSectionProps) {
  const label = forceVirtualGreenScreen ? 'Virtual Green Screen' : name;
  if (!label) return null;

  if (variant === 'inline') {
    return (
      <p className="m-0 flex items-center gap-1.5 text-sm font-medium text-accent">
        <UIcon
          name="camera"
          className={`shrink-0 text-sm ${iconTone === 'muted' ? 'text-admin-muted' : 'text-accent'}`}
        />
        <span>{label}</span>
      </p>
    );
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-accent">
        Selected Backdrop:
      </p>
      <div className="mt-1 flex items-center gap-3">
        {thumbnailUrl && !forceVirtualGreenScreen ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-16 w-16 border border-admin-hairline object-cover"
          />
        ) : null}
        <p className="m-0 text-base font-semibold text-accent">{label}</p>
      </div>
    </div>
  );
}
