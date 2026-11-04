import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadPortalEvent, loadPortalEvents } from '@/lib/portal/events';

export const dynamic = 'force-dynamic';

/**
 * Admin preview of a client's portal events: the same data the client sees.
 * ?email= or ?clientId=, plus optional ?eventId= for one event.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (session.user.email.toLowerCase() !== (process.env.ADMIN_EMAIL || '').toLowerCase()) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const emailParam = params.get('email');
  const clientId = params.get('clientId');
  const eventId = params.get('eventId');

  let email = emailParam?.trim().toLowerCase() || null;
  if (!email && clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { email: true } });
    email = client?.email ?? null;
  }
  if (!email) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    if (eventId) {
      const event = await loadPortalEvent(email, eventId);
      if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      return NextResponse.json({ success: true, event }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const events = await loadPortalEvents(email);
    return NextResponse.json({ success: true, events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error loading admin preview events:', error);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}
