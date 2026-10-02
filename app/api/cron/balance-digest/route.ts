import { NextRequest, NextResponse } from 'next/server';
import {
  adminAgreementPath,
  balanceActionPath,
  createBalanceActionToken,
} from '@/lib/balanceActionToken';
import { digestBlockFromRow, renderBalanceDigestEmail } from '@/lib/balanceDigestEmail';
import { findBalanceDigestAgreements } from '@/lib/balanceDigestQuery';
import { verifyCronSecret } from '@/lib/cronAuth';
import { sendEmail } from '@/lib/email/send';
import { reportServerError } from '@/lib/errorAlert';
import { buildFollowupDigestSections, hasFollowupDigestItems } from '@/lib/followups/digest';
import { followupsLaunchDateKey } from '@/lib/followups/rules';
import { loadFollowupCandidates } from '@/lib/followups/run';

// Vercel cron invokes this endpoint with GET (user agent: vercel-cron/1.0).
// Manual triggers can use POST. Both require the CRON_SECRET bearer token.
// The digest is sent only to ADMIN_EMAIL. Clients are never emailed from here.
// It runs before the 10am follow-up run, so "going out today" lists what that run will send.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function appBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  try {
    const rows = await findBalanceDigestAgreements(now);
    const followups = buildFollowupDigestSections(
      await loadFollowupCandidates(),
      now,
      followupsLaunchDateKey(),
      appBaseUrl(request),
    );
    if (rows.length === 0 && !hasFollowupDigestItems(followups)) {
      return NextResponse.json({
        ok: true,
        sent: false,
        count: 0,
        ranAt: now.toISOString(),
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (!adminEmail) {
      return NextResponse.json({ error: 'ADMIN_EMAIL is not configured' }, { status: 503 });
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 503 });
    }

    const baseUrl = appBaseUrl(request);
    const issuedAt = now.getTime();
    const blocks = [];

    for (const row of rows) {
      const markPaid = createBalanceActionToken(row.id, 'mark_paid', issuedAt);
      const remind = createBalanceActionToken(row.id, 'remind', issuedAt);
      const snooze = createBalanceActionToken(row.id, 'snooze', issuedAt);
      if (!markPaid || !remind || !snooze) {
        return NextResponse.json(
          { error: 'Balance action secret is not configured' },
          { status: 503 },
        );
      }

      blocks.push(
        digestBlockFromRow(
          row,
          {
            markPaidUrl: `${baseUrl}${balanceActionPath(markPaid)}`,
            remindUrl: `${baseUrl}${balanceActionPath(remind)}`,
            snoozeUrl: `${baseUrl}${balanceActionPath(snooze)}`,
            adminUrl: `${baseUrl}${adminAgreementPath(row.id)}`,
          },
          now,
        ),
      );
    }

    const email = renderBalanceDigestEmail(blocks, followups);
    await sendEmail({
      to: adminEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    console.log('[balance-digest] sent', {
      count: rows.length,
      followupsGoingOut: followups.goingOut.length,
      galleriesHeld: followups.held.length,
    });
    return NextResponse.json({
      ok: true,
      sent: true,
      count: rows.length,
      followupsGoingOut: followups.goingOut.length,
      galleriesHeld: followups.held.length,
      ranAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[balance-digest] failed', error);
    await reportServerError({
      route: '/api/cron/balance-digest',
      method: request.method,
      error,
    });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
