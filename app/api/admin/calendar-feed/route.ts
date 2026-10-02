import { NextRequest, NextResponse } from 'next/server';
import { calendarFeedUrl, getCalendarFeedKey } from '@/lib/calendarFeedKey';
import { handleApiError } from '@/lib/handleApiError';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

/** The subscribable feed URL. Admin-only, so the key never ships in public code. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const key = getCalendarFeedKey();
    if (!key) {
      return NextResponse.json(
        { error: 'Calendar feed secret is not configured.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { url: calendarFeedUrl(request.nextUrl.origin, key) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    return handleApiError(error, 'admin/calendar-feed', request.method);
  }
}
