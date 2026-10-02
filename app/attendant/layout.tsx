import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AttendantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-surface="admin">{children}</div>;
}
