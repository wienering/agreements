import { NextRequest, NextResponse } from 'next/server';
import { followupsLaunchDateKey } from '@/lib/followups/rules';
import { runFollowups } from '@/lib/followups/run';
import { handleApiError } from '@/lib/handleApiError';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Admin-only: what today's 10am follow-up run would do, right now. Always a dry run,
 * in every environment: nothing is sent, claimed, alerted or logged.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const summary = await runFollowups({ now: new Date(), dryRun: true, launchKey: followupsLaunchDateKey() });
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, 'admin/followups/dry-run', request.method);
  }
}
