import { NextRequest, NextResponse } from 'next/server';
import { authenticateSession } from '@/app/api/agreements/portal/shared/auth';
import { loadPortalEvent } from '@/lib/portal/events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateSession(request);
  if (authResult.error) return authResult.error;
  const session = authResult.session;
  try {
    const { id } = await params;
    const event = await loadPortalEvent(session.client.email, id);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ success: true, event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Error loading portal event:', err);
    return NextResponse.json({ error: 'Failed to load this event', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
