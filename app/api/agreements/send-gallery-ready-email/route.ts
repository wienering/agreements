import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import { buildReviewRequestEmail } from '@/lib/followups/reviewRequestEmail';
import { followupsDryRun, GOOGLE_REVIEW_URL_ONTARIO } from '@/lib/followups/rules';
import { sendGalleryEmail } from '@/lib/followups/send';
import {
  buildGalleryReadyEmail,
  resolveGalleryLinks,
} from './buildGalleryReadyEmail';

const sendGalleryReadyEmailSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  /** Send again after the first send. Doesn't change the sent date or the review clock. */
  resend: z.boolean().optional(),
});

const NO_GALLERY_LINKS_MESSAGE =
  'No gallery link has been set for this agreement. Please add a gallery link first.';

async function loadGalleryReadyAgreement(agreementId: string) {
  return prisma.agreement.findUnique({
    where: { id: agreementId },
    include: {
      client: true,
      event: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const agreementId = request.nextUrl.searchParams.get('agreementId');
    if (!agreementId?.trim()) {
      return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 });
    }

    const agreement = await loadGalleryReadyAgreement(agreementId.trim());
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const review = buildReviewRequestEmail(agreement.client, GOOGLE_REVIEW_URL_ONTARIO);
    const reviewPreview = { subject: review.subject, html: review.html };

    if (resolveGalleryLinks(agreement).length === 0) {
      return NextResponse.json({
        canSend: false,
        sendBlockedReason: NO_GALLERY_LINKS_MESSAGE,
        alreadySent: Boolean(agreement.galleryEmailSentAt),
        dryRun: followupsDryRun(),
        review: reviewPreview,
      });
    }

    const { subject, html } = buildGalleryReadyEmail(agreement);

    return NextResponse.json({
      canSend: true,
      subject,
      html,
      alreadySent: Boolean(agreement.galleryEmailSentAt),
      dryRun: followupsDryRun(),
      review: reviewPreview,
    });
  } catch (error) {
    return handleApiError(error, 'agreements/send-gallery-ready-email', request.method);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { agreementId, resend } = sendGalleryReadyEmailSchema.parse(await request.json());

    const dryRun = followupsDryRun();
    if (!dryRun && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS)) {
      return NextResponse.json(
        {
          error: 'Email service is not configured. Please contact support to set up email functionality.',
        },
        { status: 503 },
      );
    }

    const result = await sendGalleryEmail(agreementId, { trigger: 'manual', dryRun, resend });

    switch (result.status) {
      case 'sent': {
        const updated = await prisma.agreement.findUnique({
          where: { id: agreementId },
          select: { galleryEmailSentAt: true },
        });
        return NextResponse.json({
          success: true,
          message: resend ? 'Gallery email sent again' : 'Gallery ready email sent successfully',
          recipientEmail: result.to,
          agreementId,
          galleryEmailSentAt: updated?.galleryEmailSentAt?.toISOString() ?? null,
        });
      }
      case 'dry_run':
        return NextResponse.json({
          success: true,
          dryRun: true,
          message: `Dry run: nothing was sent. On production this would email ${result.to}.`,
          recipientEmail: result.to,
          agreementId,
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
    return handleApiError(error, 'agreements/send-gallery-ready-email', request.method);
  }
}
