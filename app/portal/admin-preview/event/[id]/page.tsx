'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PortalEventView } from '@/app/components/portal/PortalEventView';

function PreviewEvent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  return (
    <PortalEventView
      eventId={params.id}
      preview={{ email: searchParams.get('email'), clientId: searchParams.get('clientId') }}
    />
  );
}

export default function PortalAdminPreviewEventPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-160px)]" />}>
      <PreviewEvent />
    </Suspense>
  );
}
