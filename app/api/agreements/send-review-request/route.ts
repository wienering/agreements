import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { escapeHtml } from '@/lib/htmlEscape';
import { formatZodDetails } from '@/lib/handleApiError';
import { renderEmailLayout } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { getEmailGreeting } from '@/lib/email/greeting';

const sendReviewRequestSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  reviewMarket: z.enum(['ontario', 'calgary']).optional(),
});

const GOOGLE_REVIEW_URL_ONTARIO = 'https://g.page/r/CXHuVoPHi-cIEAI/review';
const GOOGLE_REVIEW_URL_CALGARY = 'https://g.page/r/CVmM2MGaxRWdEAE/review';

function reviewUrlForMarket(market: 'ontario' | 'calgary'): string {
  return market === 'calgary' ? GOOGLE_REVIEW_URL_CALGARY : GOOGLE_REVIEW_URL_ONTARIO;
}

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = sendReviewRequestSchema.parse(body);
    const reviewMarket: 'ontario' | 'calgary' = validatedData.reviewMarket ?? 'ontario';
    const reviewUrl = reviewUrlForMarket(reviewMarket);

    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      include: { client: true },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (agreement.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Review request emails can only be sent for completed agreements' },
        { status: 400 }
      );
    }

    if (!agreement.client?.email) {
      return NextResponse.json({ error: 'Client email is missing' }, { status: 400 });
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        {
          error: 'Email service is not configured. Please contact support to set up email functionality.',
          fallback: {
            reviewLink: reviewUrl,
            message: 'You can copy and share this review link with your client instead.',
          },
        },
        { status: 503 }
      );
    }

    const clientGreeting = escapeHtml(getEmailGreeting(agreement.client));
    const subject = `Would you leave us a Google review?`;

    const bodyHtml = `
      <p style="margin:0 0 16px 0;">Hello ${clientGreeting},</p>
      <p style="margin:0 0 16px 0;">Thanks again for having us out. Hope you had a great time and that the prints came out the way you wanted.</p>
      <p style="margin:0 0 16px 0;">If you have a moment, we would really appreciate it if you could leave us a Google review. It makes a big difference for a small business like ours, and helps other people find us when they are planning their own events.</p>
      <p style="margin:0 0 16px 0;">If anything was off, just reply to this email and let me know. I would rather hear it from you.</p>
      <p style="margin:16px 0 0 0;">Thanks so much,<br />Photobooth Guys</p>
      <p style="margin:16px 0 0 0;font-size:13px;color:#6E655A;">If the button doesn't work, copy and paste this link:</p>
      <p style="margin:4px 0 0 0;word-break:break-all;"><a href="${reviewUrl}" style="color:#C0552F;text-decoration:underline;">${reviewUrl}</a></p>
      <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6E655A;">Event ID: ${agreement.id}</p>
    `;

    const emailHtml = renderEmailLayout({
      title: 'Thanks again for choosing us',
      preheader: 'We would appreciate a Google review if you have a moment.',
      bodyHtml,
      cta: { label: 'Leave a Review', url: reviewUrl },
      tone: 'default',
    });

    try {
      await sendEmail({
        to: agreement.client.email,
        subject,
        html: emailHtml,
      });

      const reviewRequestSentAt = new Date();
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: { reviewRequestSentAt },
      });

      return NextResponse.json({
        message: 'Review request email sent successfully',
        recipientEmail: agreement.client.email,
        reviewRequestSentAt: reviewRequestSentAt.toISOString(),
      });
    } catch (emailError: any) {
      console.error('Review request email sending failed:', emailError);
      const msg =
        emailError?.message?.includes('timeout')
          ? 'Email service is currently unavailable. Please try again later.'
          : 'Failed to send email. Please try again later.';
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message || 'Invalid request',
          details: formatZodDetails(error),
        },
        { status: 400 },
      );
    }

    console.error('Error sending review request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
