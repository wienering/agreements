import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cronAuth';
import { reportServerError } from '@/lib/errorAlert';
import { followupsDryRun, followupsLaunchDateKey, isFollowupRunHour } from '@/lib/followups/rules';
import { runFollowups } from '@/lib/followups/run';

// Vercel cron invokes this endpoint with GET at 14:00 and 15:00 UTC (user agent: vercel-cron/1.0).
// Only the run that lands in the 10am Toronto hour acts, so it's 10am in both EDT and EST.
// Manual triggers can use POST. Both require the CRON_SECRET bearer token.
// Outside production every run is a dry run: nothing is sent, claimed or alerted.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  if (!isFollowupRunHour(now)) {
    return NextResponse.json({ ok: true, skipped: 'Not the 10am Toronto hour', ranAt: now.toISOString() });
  }

  const dryRun = followupsDryRun();
  if (!dryRun && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    return NextResponse.json({ error: 'SMTP not configured' }, { status: 503 });
  }

  try {
    const summary = await runFollowups({ now, dryRun, launchKey: followupsLaunchDateKey() });
    console.log('[post-event-followups] completed', JSON.stringify(summary));
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error('[post-event-followups] failed', error);
    await reportServerError({ route: '/api/cron/post-event-followups', method: request.method, error });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
