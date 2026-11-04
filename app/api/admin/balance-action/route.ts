import { queueCalendarSync } from '@/lib/googleCalendar/sync';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logEventActivity } from '@/lib/events/booking';
import { loadBalanceActionEvent } from '@/lib/events/balanceActionEvent';
import { balanceActionRefusal } from '@/lib/balanceAction';
import { verifyBalanceActionToken } from '@/lib/balanceActionToken';
import { balanceDigestSnoozeUntil, FULLY_PAID_STATUS } from '@/lib/balanceDigest';
import { formatDateToronto } from '@/lib/dates';
import { sendEmail } from '@/lib/email/send';
import { formatZodDetails, handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { renderBalanceReminderEmail } from '@/lib/balanceReminderMessage';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().min(1),
  subject: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().min(1).max(8000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodDetails(parsed.error) },
        { status: 400 },
      );
    }

    const payload = verifyBalanceActionToken(parsed.data.token);
    if (!payload) {
      return NextResponse.json(
        { error: 'This link is invalid or has expired.' },
        { status: 400 },
      );
    }

    const agreement = await loadBalanceActionEvent(payload.agreementId);

    if (!agreement) {
      return NextResponse.json(
        { error: 'This event could not be found. Nothing was changed.' },
        { status: 404 },
      );
    }

    const refusal = balanceActionRefusal(agreement);
    if (refusal) {
      return NextResponse.json({ error: refusal }, { status: 409 });
    }

    if (payload.action === 'mark_paid') {
      await prisma.event.update({
        where: { id: agreement.id },
        data: { paymentStatus: FULLY_PAID_STATUS },
      });
      await logEventActivity(agreement.id, 'PAYMENT_MARKED_PAID');
      queueCalendarSync(agreement.id);
      return NextResponse.json({
        ok: true,
        action: payload.action,
        agreementId: agreement.id,
        message: 'Marked as paid.',
      });
    }

    if (payload.action === 'snooze') {
      const until = balanceDigestSnoozeUntil();
      await prisma.event.update({
        where: { id: agreement.id },
        data: { balanceDigestSnoozedUntil: until },
      });
      const untilLabel = formatDateToronto(until, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      return NextResponse.json({
        ok: true,
        action: payload.action,
        agreementId: agreement.id,
        message: `Digest snoozed until ${untilLabel}.`,
      });
    }

    const subject = parsed.data.subject;
    const message = parsed.data.message;
    if (!subject || !message) {
      return NextResponse.json(
        { error: 'A subject and message are required.' },
        { status: 400 },
      );
    }

    const recipient = agreement.client.email.trim();
    if (!recipient) {
      return NextResponse.json(
        { error: 'This event has no client email. Nothing was sent.' },
        { status: 400 },
      );
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 503 });
    }

    await sendEmail({
      to: recipient,
      subject,
      html: renderBalanceReminderEmail(subject, message),
      text: message,
    });

    await prisma.event.update({
      where: { id: agreement.id },
      data: { balanceReminderSentAt: new Date() },
    });
    await logEventActivity(agreement.id, 'BALANCE_REMINDER_SENT', {
      recipient,
    });

    return NextResponse.json({
      ok: true,
      action: payload.action,
      agreementId: agreement.id,
      message: 'Reminder sent.',
    });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodDetails(error) },
        { status: 400 },
      );
    }
    return handleApiError(error, 'admin/balance-action', request.method);
  }
}
