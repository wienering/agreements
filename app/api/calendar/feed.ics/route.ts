import { NextRequest, NextResponse } from 'next/server';
import { buildCalendarFeed } from '@/lib/calendarFeed';
import { isValidCalendarFeedKey } from '@/lib/calendarFeedKey';
import { findCalendarFeedAgreements } from '@/lib/calendarFeedQuery';
import { handleApiError } from '@/lib/handleApiError';

export const dynamic = 'force-dynamic';

/** Calendar apps can't send login headers, so the signed key in the URL is the protection. */
export async function GET(request: NextRequest) {
  if (!isValidCalendarFeedKey(request.nextUrl.searchParams.get('key'))) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const now = new Date();
    const agreements = await findCalendarFeedAgreements(now);
    const body = buildCalendarFeed(agreements, now);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="photobooth-guys-events.ics"',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return handleApiError(error, 'calendar/feed', request.method);
  }
}
