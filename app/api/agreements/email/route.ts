import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { devLog } from '@/lib/logger';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { escapeHtml } from '@/lib/htmlEscape';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { handleApiError } from '@/lib/handleApiError';
import {
  renderContentPanel,
  renderCtaButton,
  renderEmailLayout,
  renderNoticeBlock,
} from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { formatDateToronto } from '@/lib/dates';

const emailRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  recipientEmail: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = emailRequestSchema.parse(body);

    // Find the agreement by token
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        status: 'SIGNED' // Only allow email for signed agreements
      },
      include: {
        client: true,
        template: true,
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Signed agreement not found or has expired' 
      }, { status: 404 });
    }

    const recipientEmail = validatedData.recipientEmail.toLowerCase();
    const primaryEmail = agreement.client.email.toLowerCase();
    const matchesPrimary = primaryEmail === recipientEmail;
    const matchesSecondSigner =
      agreement.secondSignerEnabled &&
      !!agreement.secondSignerEmail &&
      agreement.secondSignerEmail.toLowerCase() === recipientEmail;

    if (!matchesPrimary && !matchesSecondSigner) {
      return NextResponse.json(
        { error: 'Recipient email does not match agreement signers' },
        { status: 403 }
      );
    }

    const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
    const processedHtml = processHtmlContent(
      htmlToProcess,
      agreement.client,
      agreement.id,
      agreement.event,
      pickSecondSigner(agreement),
    );
    const clientFirstName = escapeHtml(agreement.client.firstName);
    const clientLastName = escapeHtml(agreement.client.lastName);
    const clientEmail = escapeHtml(agreement.client.email);

    // Get the base URL from request headers or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const agreementUrl = `${baseUrl}/agreement/${validatedData.token}`;
    const downloadUrl = `${agreementUrl}#download`;

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ 
        error: 'Email service is not configured. Please contact support to set up email functionality.' 
      }, { status: 503 });
    }

    const introMessage =
      'Please find a copy of your previously signed service agreement below. This agreement is already legally binding and does not require any further action from you.';

    const detailsHtml = `
      <strong>Client:</strong> ${clientFirstName} ${clientLastName}<br>
      <strong>Email:</strong> ${clientEmail}<br>
      <strong>Date Signed:</strong> ${agreement.signedAt ? formatDateToronto(agreement.signedAt) : 'N/A'}<br>
      <strong>Agreement ID:</strong> ${agreement.id}<br>
      <strong>Status:</strong> Already Signed`;

    const bodyHtml = `
      <p style="margin:0 0 16px 0;">Hello ${clientFirstName},</p>
      <p style="margin:0 0 16px 0;">${introMessage}</p>
      ${renderCtaButton({ label: 'View Agreement', url: agreementUrl, tone: 'default' })}
      ${renderNoticeBlock('Agreement Details', detailsHtml, 'default')}
      ${renderContentPanel(processedHtml)}
      <p style="margin:16px 0;">This document was digitally signed and is legally binding.</p>
      <p style="margin:0 0 16px 0;">
        You can also <a href="${downloadUrl}" style="color:#C0552F;text-decoration:underline;">download a PDF copy</a>.
      </p>
      <p style="margin:0 0 16px 0;">If you have any questions, please contact us at info@photoboothguys.ca</p>
    `;

    const emailHtml = renderEmailLayout({
      title: 'Your Signed Service Agreement',
      preheader: introMessage,
      bodyHtml,
      tone: 'default',
    });

    try {
      const info = await sendEmail({
        to: validatedData.recipientEmail,
        subject: `Copy of Your Signed Agreement - ${clientFirstName} ${clientLastName}`,
        html: emailHtml,
      });

      devLog('Email sent successfully:', info);

      return NextResponse.json({
        message: 'Agreement sent successfully',
        recipientEmail: validatedData.recipientEmail
      });
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      // Return a more helpful error message
      if (emailError.message && emailError.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Email service is currently unavailable. Please try again later or contact support.' 
        }, { status: 503 });
      } else if (emailError.message && emailError.message.includes('authentication')) {
        return NextResponse.json({ 
          error: 'Email authentication failed. Please contact support to fix email configuration.' 
        }, { status: 503 });
      } else {
        return NextResponse.json({ 
          error: 'Failed to send email. Please try again later or contact support.' 
        }, { status: 500 });
      }
    }

  } catch (error) {
    return handleApiError(error, 'agreements/email');
  }
}
