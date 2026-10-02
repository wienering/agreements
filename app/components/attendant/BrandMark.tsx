import type { ReactNode } from 'react';
import { UIcon } from '../UIcon';

type BrandMarkProps = {
  size: 'header' | 'footer' | 'notice';
  subtitle?: string;
  extra?: ReactNode;
};

const boxClass = {
  header: 'h-11 w-11',
  footer: 'h-8 w-8',
  notice: 'h-8 w-8',
} as const;

const iconClass = {
  header: 'text-2xl text-accent-on',
  footer: 'text-2xl text-accent-on',
  notice: 'text-base text-accent-on',
} as const;

export function BrandMark({ size, subtitle, extra }: BrandMarkProps) {
  const Title = size === 'header' ? 'h1' : 'h3';

  return (
    <div className={size === 'header' ? 'flex items-center gap-4' : 'inline-flex items-center gap-3'}>
      <div
        className={`flex items-center justify-center rounded-sm bg-accent font-semibold text-accent-on ${boxClass[size]}`}
      >
        <UIcon name="camera" className={iconClass[size]} />
      </div>
      {size === 'header' ? (
        <div>
          <Title className="admin-page-title m-0 text-2xl !font-bold text-admin-text">Photobooth Guys</Title>
          {subtitle ? <p className="m-0 mt-1 text-sm font-medium text-admin-muted">{subtitle}</p> : null}
        </div>
      ) : (
        <>
          <Title className="m-0 text-base font-bold text-admin-text">Photobooth Guys</Title>
          {extra}
        </>
      )}
    </div>
  );
}
