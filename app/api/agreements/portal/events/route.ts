import { NextRequest, NextResponse } from 'next/server';
import { authenticateSession } from '@/app/api/agreements/portal/shared/auth';
import { loadPortalEvents } from '@/lib/portal/events';

export const dynamic = 'force-dynamic';

/** The signed-in client's events (all their client records with the same email). */
export async function GET(request: NextRequest) {
  const authResult = await authenticateSession(request);
  if (authResult.error) return authResult.error;
  const session = authResult.session;
  try {
    const events = await loadPortalEvents(session.client.email);
    return NextResponse.json({ success: true, events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Error loading portal events:', err);
    return NextResponse.json({ error: 'Failed to load your events', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
