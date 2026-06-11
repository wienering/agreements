import { NextRequest, NextResponse } from 'next/server';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendViewAlertEmail } from '@/lib/view-alert-email';
import { renderEmailLayout, renderNoticeBlock } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { z } from 'zod';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { escapeHtml } from '@/lib/htmlEscape';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { handleApiError } from '@/lib/handleApiError';
import { logAgreementActivity } from '@/lib/activityLog';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyEmailSchema.parse(body);

    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        OR: [
          { status: { in: ['SIGNED', 'COMPLETED'] } },
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      include: {
        client: true,
        template: true,
        event: true,
        fields: true,
        signatures: {
          orderBy: { signedAt: 'asc' },
          select: {
            signerName: true,
            signerEmail: true,
            signedAt: true,
            method: true,
          },
        },
      }
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const inputEmail = validatedData.email.toLowerCase();
    const primaryEmail = agreement.client.email.toLowerCase();
    const secondarySignerEnabled = Boolean((agreement as any).secondSignerEnabled);
    const secondaryEmailRaw = (agreement as any).secondSignerEmail as string | null | undefined;
    const secondaryEmail = secondaryEmailRaw ? secondaryEmailRaw.toLowerCase() : null;

    const matchesPrimary = primaryEmail === inputEmail;
    const matchesSecondary = secondarySignerEnabled && !!secondaryEmail && secondaryEmail === inputEmail;
    const emailMatches = matchesPrimary || matchesSecondary;

    if (emailMatches) {
      // Track view + send alert (wrapped in try-catch so it never blocks verification)
      try {
        const isFirstView = !agreement.firstViewedAt;
        devLog('[verify-email] Email matched. isFirstView:', isFirstView, 'agreementId:', agreement.id);

        await prisma.agreement.update({
          where: { id: agreement.id },
          data: {
            firstViewedAt: agreement.firstViewedAt || new Date(),
            lastViewedAt: new Date(),
            viewCount: agreement.viewCount + 1,
          },
        });
        devLog('[verify-email] View tracking updated. viewCount:', agreement.viewCount + 1);

        if (isFirstView) {
          devLog('[verify-email] First view - sending view alert email...');
          const sent = await sendViewAlertEmail(agreement, getClientIP(request), request.headers.get('user-agent') || 'Unknown');
          devLog('[verify-email] View alert email result:', sent ? 'SENT' : 'FAILED');
          await logAgreementActivity(agreement.id, 'VIEWED');
        }
      } catch (viewErr) {
        console.error('[verify-email] View tracking/email failed (non-blocking):', viewErr);
      }

      let processedHtml;
      if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
        processedHtml = agreement.mergedHtml;
      } else {
        const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
        processedHtml = processHtmlContent(
          htmlToProcess,
          agreement.client,
          agreement.id,
          agreement.event,
          pickSecondSigner(agreement),
        );
      }

      const client = {
        ...agreement.client,
        packagePrice: agreement.client.packagePrice != null ? Number(agreement.client.packagePrice) : null,
      };

      const { internalTitle, ...publicTemplate } = agreement.template;

      // Build secondary signer summary (without phone — not needed by client UI)
      const secondSigner = secondarySignerEnabled
        ? {
            firstName: (agreement as any).secondSignerFirstName || '',
            lastName: (agreement as any).secondSignerLastName || '',
            email: secondaryEmailRaw || '',
          }
        : null;

      // Identify which signer just verified (so the page can prefill the sign modal)
      const verifiedContact = matchesPrimary
        ? {
            role: 'primary' as const,
            firstName: agreement.client.firstName || '',
            lastName: agreement.client.lastName || '',
            email: agreement.client.email,
          }
        : {
            role: 'secondary' as const,
            firstName: (agreement as any).secondSignerFirstName || '',
            lastName: (agreement as any).secondSignerLastName || '',
            email: secondaryEmailRaw || validatedData.email,
          };

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        verifiedContact,
        agreement: {
          id: agreement.id,
          client,
          template: { ...publicTemplate, htmlContent: processedHtml },
          status: agreement.status,
          signedAt: agreement.signedAt,
          signedFromIP: agreement.signedFromIP,
          mergedHtml: agreement.mergedHtml,
          event: agreement.event,
          fields: agreement.fields,
          secondSignerEnabled: secondarySignerEnabled,
          requireBothSignatures: Boolean((agreement as any).requireBothSignatures),
          secondSigner,
          signatures: (agreement as any).signatures || [],
        }
      });
    } else {
      // Wrong email — send unauthorized access alert
      const expectedEmails = [agreement.client.email];
      if (secondarySignerEnabled && secondaryEmailRaw) expectedEmails.push(secondaryEmailRaw);
      devLog('[verify-email] Email mismatch. expected one of:', expectedEmails.join(', '), 'got:', validatedData.email);
      try {
        await sendUnauthorizedAccessEmail({
          agreementId: agreement.id,
          clientEmail: expectedEmails.join(' / '),
          attemptedEmail: validatedData.email,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || 'Unknown',
          timestamp: new Date()
        });
      } catch (alertErr) {
        console.error('[verify-email] Unauthorized access email failed:', alertErr);
      }

      return NextResponse.json({
        error: 'Email address does not match the agreement. Please check your email and try again.',
        success: false
      }, { status: 403 });
    }

  } catch (error) {
    return handleApiError(error, 'agreements/verify-email');
  }
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'Unknown';
}

async function sendUnauthorizedAccessEmail(data: {
  agreementId: string;
  clientEmail: string;
  attemptedEmail: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    devLog('[verify-email] SMTP not configured - skipping unauthorized access email');
    return;
  }

  const safeAgreementId = escapeHtml(data.agreementId);
  const safeClientEmail = escapeHtml(data.clientEmail);
  const safeAttemptedEmail = escapeHtml(data.attemptedEmail);
  const safeIpAddress = escapeHtml(data.ipAddress);
  const safeUserAgent = escapeHtml(data.userAgent);

  const detailsHtml = `
    <ul style="margin:0;padding-left:20px;">
      <li><strong>Agreement ID:</strong> ${safeAgreementId}</li>
      <li><strong>Correct Email:</strong> ${safeClientEmail}</li>
      <li><strong>Attempted Email:</strong> ${safeAttemptedEmail}</li>
      <li><strong>IP Address:</strong> ${safeIpAddress}</li>
      <li><strong>User Agent:</strong> ${safeUserAgent}</li>
      <li><strong>Timestamp:</strong> ${data.timestamp.toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</li>
    </ul>`;

  const bodyHtml = `
    ${renderNoticeBlock('Unauthorized Access Detected', 'Someone attempted to access an agreement with an incorrect email address.', 'alert')}
    ${renderNoticeBlock('Access Details', detailsHtml, 'alert')}
    <p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:#6E655A;text-align:center;">
      This alert was automatically generated by the Photobooth Guys Agreement System
    </p>
  `;

  const emailHtml = renderEmailLayout({
    title: 'Unauthorized Access Attempt',
    preheader: 'Unauthorized access attempt detected.',
    bodyHtml,
    tone: 'alert',
  });

  const alertTo = process.env.ADMIN_EMAIL || 'info@photoboothguys.ca';
  devLog('[verify-email] Sending unauthorized access alert to:', alertTo);

  await sendEmail({
    to: alertTo,
    subject: `Security Alert: Unauthorized Access Attempt - Agreement ${data.agreementId}`,
    html: emailHtml,
  });

  devLog('[verify-email] Unauthorized access alert SENT to', alertTo);
}
