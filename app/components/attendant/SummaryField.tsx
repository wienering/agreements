import type { ReactNode } from 'react';

export function SummaryField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="m-0 mb-1 text-sm font-semibold uppercase tracking-wider text-admin-muted">{label}</p>
      {children}
    </div>
  );
}

export function SummaryText({ children }: { children: ReactNode }) {
  return <p className="m-0 text-base font-medium text-admin-text">{children}</p>;
}
