'use client';

import { useParams } from 'next/navigation';
import { PortalEventView } from '@/app/components/portal/PortalEventView';

export default function PortalEventPage() {
  const params = useParams<{ id: string }>();
  return <PortalEventView eventId={params.id} />;
}
