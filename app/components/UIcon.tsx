import type { CSSProperties } from 'react';

export type UIconName = string;

type UIconProps = {
  name: UIconName;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

/**
 * Flaticon UIcons — regular rounded (`fi fi-rr-*`).
 * Requires `@flaticon/flaticon-uicons/css/regular/rounded.css` in the app layout.
 */
export function UIcon({ name, className = '', style, title }: UIconProps) {
  return (
    <i
      className={`fi fi-rr-${name} ${className}`.trim()}
      style={{
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      title={title}
    />
  );
}
