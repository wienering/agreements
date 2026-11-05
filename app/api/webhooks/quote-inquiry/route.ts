import { NextRequest, NextResponse } from 'next/server';

/**
 * Retired (Nov 2026). The website quote tool still calls this, but leads now reach the CRM through n8n
 * WF1 (POST /api/n8n/leads), which also adds the Sheet row and links the two. Creating the lead here as
 * well meant two database writes per form and a duplicate to reconcile, so this only acknowledges the call.
 * The route stays so the website never sees an error; it can be deleted once the quote tool stops calling it.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.QUOTE_WEBHOOK_SECRET;
  if (secret && request.headers.get('x-quote-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, retired: true, message: 'Leads now come in through n8n.' });
}
