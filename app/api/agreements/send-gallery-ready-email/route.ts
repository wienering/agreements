import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import { sendEmail } from '@/lib/email/send';
import {
  buildGalleryReadyEmail,
  resolveGalleryLinks,
} from './buildGalleryReadyEmail';

const sendGalleryReadyEmailSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
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

    if (resolveGalleryLinks(agreement).length === 0) {
      return NextResponse.json({
        canSend: false,
        sendBlockedReason: NO_GALLERY_LINKS_MESSAGE,
      });
    }

    const { subject, html } = buildGalleryReadyEmail(agreement);

    return NextResponse.json({
      canSend: true,
      subject,
      html,
    });
  } catch (error) {
    return handleApiError(error, 'agreements/send-gallery-ready-email', request.method);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validatedData = sendGalleryReadyEmailSchema.parse(body);

    const agreement = await loadGalleryReadyAgreement(validatedData.agreementId);

    if (!agreement) {
      return NextResponse.json(
        {
          error: 'Agreement not found',
        },
        { status: 404 },
      );
    }

    if (resolveGalleryLinks(agreement).length === 0) {
      return NextResponse.json(
        {
          error: NO_GALLERY_LINKS_MESSAGE,
        },
        { status: 400 },
      );
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        {
          error: 'Email service is not configured. Please contact support to set up email functionality.',
        },
        { status: 503 },
      );
    }

    const { subject, html } = buildGalleryReadyEmail(agreement);

    try {
      const info = await sendEmail({
        to: agreement.client.email,
        subject,
        html,
      });

      devLog('Gallery ready email sent successfully:', info);

      await prisma.agreement.update({
        where: { id: agreement.id },
        data: { galleryEmailSentAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Gallery ready email sent successfully',
        recipientEmail: agreement.client.email,
        agreementId: agreement.id,
      });
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);

      if (emailError.message && emailError.message.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Email service is currently unavailable. Please try again later.',
          },
          { status: 503 },
        );
      }
      if (emailError.message && emailError.message.includes('authentication')) {
        return NextResponse.json(
          {
            error: 'Email authentication failed. Please contact support.',
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        {
          error: 'Failed to send email. Please try again later.',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return handleApiError(error, 'agreements/send-gallery-ready-email', request.method);
  }
}
