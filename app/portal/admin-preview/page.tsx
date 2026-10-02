'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PortalDashboard } from '@/app/components/portal/PortalDashboard';

function PortalAdminPreviewContent() {
  const searchParams = useSearchParams();

  return (
    <PortalDashboard
      mode="adminPreview"
      adminEmail={searchParams.get('email')}
      adminClientId={searchParams.get('clientId')}
    />
  );
}

export default function PortalAdminPreview() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
            <p className="text-muted">Loading...</p>
          </div>
        </div>
      }
    >
      <PortalAdminPreviewContent />
    </Suspense>
  );
}
