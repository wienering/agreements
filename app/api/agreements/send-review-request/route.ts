import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import {
  followupsDryRun,
  GOOGLE_REVIEW_URL_CALGARY,
  GOOGLE_REVIEW_URL_ONTARIO,
} from '@/lib/followups/rules';
import { sendReviewRequest } from '@/lib/followups/send';

const sendReviewRequestSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  reviewMarket: z.enum(['ontario', 'calgary']).optional(),
});

/**
 * Manual "send it now" for the one-time review request. Same email as the automatic one;
 * only this button offers the Calgary link. Refused once any review request has gone out.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { agreementId, reviewMarket = 'ontario' } = sendReviewRequestSchema.parse(await request.json());
    const reviewUrl = reviewMarket === 'calgary' ? GOOGLE_REVIEW_URL_CALGARY : GOOGLE_REVIEW_URL_ONTARIO;

    const dryRun = followupsDryRun();
    if (!dryRun && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
      return NextResponse.json(
        {
          error: 'Email service is not configured. Please contact support to set up email functionality.',
          fallback: {
            reviewLink: reviewUrl,
            message: 'You can copy and share this review link with your client instead.',
          },
        },
        { status: 503 },
      );
    }

    const result = await sendReviewRequest(agreementId, {
      trigger: 'manual',
      dryRun,
      reviewUrl,
      market: reviewMarket,
    });

    switch (result.status) {
      case 'sent':
        return NextResponse.json({
          message: 'Review request email sent successfully',
          recipientEmail: result.to,
          reviewRequestSentAt: new Date().toISOString(),
        });
      case 'dry_run':
        return NextResponse.json({
          dryRun: true,
          message: `Dry run: nothing was sent. On production this would email ${result.to}.`,
          recipientEmail: result.to,
        });
      case 'refused':
        return NextResponse.json(
          { error: result.reason },
          { status: result.reason === 'Agreement not found' ? 404 : 409 },
        );
      case 'failed':
        return NextResponse.json(
          { error: 'Failed to send email. Nothing was recorded as sent. Please try again later.' },
          { status: 503 },
        );
    }
  } catch (error) {
    return handleApiError(error, 'agreements/send-review-request', request.method);
  }
}
