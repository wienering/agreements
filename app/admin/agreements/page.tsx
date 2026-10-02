import { Suspense } from 'react';
import AgreementsAdminPage from './_components/AgreementsAdminPage';

export default function AgreementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-admin-bg" />}>
      <AgreementsAdminPage />
    </Suspense>
  );
}
