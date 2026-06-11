export default function AttendantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-surface="admin">{children}</div>;
}
