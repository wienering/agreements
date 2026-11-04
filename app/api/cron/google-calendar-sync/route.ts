import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cronAuth';
import { reportServerError } from '@/lib/errorAlert';
import { reconcileGoogleCalendar } from '@/lib/googleCalendar/sync';

// Vercel cron invokes this endpoint with GET (user agent: vercel-cron/1.0).
// Manual triggers can use POST. Both require the CRON_SECRET bearer token.
// Nightly catch-up so Google Calendar matches every event; changes made in the app sync right away.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await reconcileGoogleCalendar(new Date());
    console.log('[google-calendar-sync] completed', summary);
    if (summary.failed > 0) {
      await reportServerError({
        route: '/api/cron/google-calendar-sync',
        method: request.method,
        error: new Error(`${summary.failed} event(s) failed to sync to Google Calendar`),
      });
    }
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...summary });
  } catch (error) {
    console.error('[google-calendar-sync] failed', error);
    await reportServerError({ route: '/api/cron/google-calendar-sync', method: request.method, error });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
