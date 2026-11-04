import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateSession } from '@/app/api/agreements/portal/shared/auth';
import { fetchPublicBackdrops } from '@/lib/backdrops/publicBackdrops';
import { persistBackdropSelection } from '@/lib/backdropSelectionPersistence';
import { portalEventAttendantId } from '@/lib/portal/events';

export const dynamic = 'force-dynamic';

/** The backdrops the client can pick from: their attendant's public backdrops. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateSession(request);
  if (authResult.error) return authResult.error;
  const session = authResult.session;
  const { id } = await params;
  const attendantId = await portalEventAttendantId(session.client.email, id);
  if (!attendantId) {
    return NextResponse.json({ success: true, backdrops: [], available: false });
  }
  try {
    const backdrops = await fetchPublicBackdrops(attendantId);
    return NextResponse.json({ success: true, backdrops, available: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Error loading backdrops for portal:', err);
    return NextResponse.json({ error: 'Backdrops are unavailable right now. Please try again shortly.' }, { status: 502 });
  }
}

const selectionSchema = z.object({ backdropName: z.string().trim().min(1).max(200) });

/** Save the client's backdrop choice on the event. It must be one of their attendant's backdrops. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateSession(request);
  if (authResult.error) return authResult.error;
  const session = authResult.session;
  const { id } = await params;
  const parsed = selectionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Pick a backdrop' }, { status: 400 });

  const attendantId = await portalEventAttendantId(session.client.email, id);
  if (!attendantId) return NextResponse.json({ error: 'Backdrop choices are not open for this event yet.' }, { status: 409 });

  try {
    const backdrops = await fetchPublicBackdrops(attendantId);
    if (!backdrops.some((backdrop) => backdrop.name === parsed.data.backdropName)) {
      return NextResponse.json({ error: 'That backdrop is no longer available.' }, { status: 400 });
    }
  } catch (err) {
    console.error('Error checking backdrop for portal:', err);
    return NextResponse.json({ error: 'Backdrops are unavailable right now. Please try again shortly.' }, { status: 502 });
  }

  const result = await persistBackdropSelection([id], parsed.data.backdropName, 'client');
  if (result.rateLimited) {
    return NextResponse.json({ error: 'Too many changes. Please wait a minute and try again.' }, { status: 429 });
  }
  return NextResponse.json({ success: true, selectedName: parsed.data.backdropName });
}
