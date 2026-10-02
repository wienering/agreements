import { NextRequest, NextResponse } from 'next/server';
import { logAgreementActivity } from '@/lib/activityLog';
import {
  filterDueChaseAgreements,
  formatEventDateForTelegram,
  getEventDate,
  NEXT_ACTION_REMINDERS_EXHAUSTED,
  resolveReminderRecipient,
  type ChaseAgreement,
} from '@/lib/chaseUnsignedAgreement';
import { verifyCronSecret } from '@/lib/cronAuth';
import { reportServerError } from '@/lib/errorAlert';
import { sendChaseReminderEmail } from '@/lib/email/chaseReminderEmail';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

// Vercel cron invokes this endpoint with GET (user agent: vercel-cron/1.0).
// Manual triggers can use POST. Both require the CRON_SECRET bearer token.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type ChaseAttemptResult = {
  agreementId: string;
  status: 'sent' | 'failed';
  error?: string;
};

async function runChaseUnsigned(baseUrl: string) {
  const now = new Date();
  const candidates = await prisma.agreement.findMany({
    where: {
      status: { in: ['SENT', 'LIVE'] },
      archived: false,
      chaserPaused: false,
      reminderCount: { lt: 2 },
      lastEmailedAt: { not: null },
      emailSendCount: { gt: 0 },
    },
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
          emailGreetingName: true,
          email: true,
          eventDate: true,
        },
      },
      event: {
        select: {
          eventDate: true,
        },
      },
      signatures: {
        select: {
          signerEmail: true,
        },
      },
    },
  });

  const dueAgreements = filterDueChaseAgreements(candidates as ChaseAgreement[], now);
  const results: ChaseAttemptResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const agreement of dueAgreements) {
    const recipient = resolveReminderRecipient(agreement);
    if (!recipient) {
      continue;
    }

    const reminderNumber = (agreement.reminderCount + 1) as 1 | 2;

    try {
      await sendChaseReminderEmail({
        agreement,
        reminderNumber,
        recipient,
        baseUrl,
      });

      const updateData: {
        reminderCount: number;
        lastReminderAt: Date;
        nextAction?: string;
      } = {
        reminderCount: reminderNumber,
        lastReminderAt: now,
      };

      if (reminderNumber === 2 && !agreement.nextAction) {
        updateData.nextAction = NEXT_ACTION_REMINDERS_EXHAUSTED;
      }

      await prisma.agreement.update({
        where: { id: agreement.id },
        data: updateData,
      });

      await logAgreementActivity(agreement.id, 'REMINDER_SENT', {
        reminderNumber,
        recipient: recipient.recipient,
      });

      const clientName = `${agreement.client.firstName} ${agreement.client.lastName}`.trim();
      const eventDate = getEventDate(agreement);
      const eventLabel = eventDate
        ? formatEventDateForTelegram(eventDate)
        : 'No event date';
      let telegramMessage = `Reminder ${reminderNumber} sent: ${clientName}, event ${eventLabel}, to ${recipient.recipient}.`;
      if (reminderNumber === 2) {
        telegramMessage += ' Final automated reminder — manual follow-up needed.';
      }
      await sendTelegramMessage(telegramMessage);

      sent += 1;
      results.push({ agreementId: agreement.id, status: 'sent' });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[chase-unsigned] Failed for agreement', agreement.id, error);
      results.push({ agreementId: agreement.id, status: 'failed', error: message });
    }
  }

  return {
    checked: dueAgreements.length,
    sent,
    failed,
    results,
  };
}

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ error: 'SMTP not configured' }, { status: 503 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`;

  try {
    const summary = await runChaseUnsigned(baseUrl);
    console.log('[chase-unsigned] completed', summary);
    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      ...summary,
    });
  } catch (error) {
    console.error('[chase-unsigned] failed', error);
    await reportServerError({
      route: '/api/cron/chase-unsigned',
      method: request.method,
      error,
    });
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
