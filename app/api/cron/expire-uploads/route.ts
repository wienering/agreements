import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cronAuth';
import { reportServerError } from '@/lib/errorAlert';
import {
  runUploadAutoDelete,
  uploadAutoDeleteEnabled,
  uploadAutoDeleteMessages,
} from '@/lib/files/autoDelete';
import { sendTelegramMessage } from '@/lib/telegram';

// Vercel cron invokes this endpoint with GET (user agent: vercel-cron/1.0).
// Manual triggers can use POST. Both require the CRON_SECRET bearer token.
// Report-only unless UPLOAD_AUTODELETE_ENABLED=true on production (see lib/files/autoDelete.ts).

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runUploadAutoDelete({ now: new Date(), dryRun: !uploadAutoDeleteEnabled() });
    for (const message of uploadAutoDeleteMessages(summary)) {
      await sendTelegramMessage(message);
    }
    console.log('[expire-uploads] completed', summary);
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...summary });
  } catch (error) {
    console.error('[expire-uploads] failed', error);
    await reportServerError({
      route: '/api/cron/expire-uploads',
      method: request.method,
      error,
    });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
