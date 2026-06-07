import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendViewAlertEmail } from '@/lib/view-alert-email';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { applySignerSmartFields, pickSecondSigner } from '@/lib/agreementSmartFields';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyEmailSchema.parse(body);

    // TODO(security): enforce expiresAt here (same rules as GET /api/agreements/client) — currently
    // expired unsigned agreements can still verify and load via this endpoint.
    const agreement = await prisma.agreement.findUnique({
      where: { uniqueToken: validatedData.token },
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

    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      let processedHtml = applySignerSmartFields(html, client, pickSecondSigner(agreement));
      const address = event ? (event.eventLocation ?? '') : (client.address || '');
      const notes = event ? (event.notes ?? '') : (client.notes || '');

      processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, address);
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, notes);

      const eventDate = event ? event.eventDate : client.eventDate;
      const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
      const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
      const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
      const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
      const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
      const packagePrice = event ? event.packagePrice : client.packagePrice;

      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
      processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, packagePrice ? `$${Number(packagePrice).toFixed(2)}` : '');
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');

      return processedHtml;
    };

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
        console.log('[verify-email] Email matched. isFirstView:', isFirstView, 'agreementId:', agreement.id);

        await prisma.agreement.update({
          where: { id: agreement.id },
          data: {
            firstViewedAt: agreement.firstViewedAt || new Date(),
            lastViewedAt: new Date(),
            viewCount: agreement.viewCount + 1,
          },
        });
        console.log('[verify-email] View tracking updated. viewCount:', agreement.viewCount + 1);

        if (isFirstView) {
          console.log('[verify-email] First view - sending view alert email...');
          const sent = await sendViewAlertEmail(agreement, getClientIP(request), request.headers.get('user-agent') || 'Unknown');
          console.log('[verify-email] View alert email result:', sent ? 'SENT' : 'FAILED');
        }
      } catch (viewErr) {
        console.error('[verify-email] View tracking/email failed (non-blocking):', viewErr);
      }

      let processedHtml;
      if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
        processedHtml = agreement.mergedHtml;
      } else {
        const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
        processedHtml = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event);
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
      console.log('[verify-email] Email mismatch. expected one of:', expectedEmails.join(', '), 'got:', validatedData.email);
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

  } catch (error: any) {
    console.error('[verify-email] Unhandled error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
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
    console.log('[verify-email] SMTP not configured - skipping unauthorized access email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .alert { background-color: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .details { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #dc2626;">🚨 Security Alert</h1>
          <h2>Unauthorized Access Attempt</h2>
        </div>
        <div class="alert">
          <h3 style="color: #dc2626; margin-top: 0;">⚠️ Unauthorized Access Detected</h3>
          <p>Someone attempted to access an agreement with an incorrect email address.</p>
        </div>
        <div class="details">
          <h3>Access Details:</h3>
          <ul>
            <li><strong>Agreement ID:</strong> ${data.agreementId}</li>
            <li><strong>Correct Email:</strong> ${data.clientEmail}</li>
            <li><strong>Attempted Email:</strong> ${data.attemptedEmail}</li>
            <li><strong>IP Address:</strong> ${data.ipAddress}</li>
            <li><strong>User Agent:</strong> ${data.userAgent}</li>
            <li><strong>Timestamp:</strong> ${data.timestamp.toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</li>
          </ul>
        </div>
        <div class="footer">
          <p>This alert was automatically generated by the Photobooth Guys Agreement System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const alertTo = process.env.ADMIN_EMAIL || 'info@photoboothguys.ca';
  console.log('[verify-email] Sending unauthorized access alert to:', alertTo);

  await transporter.verify();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: alertTo,
    subject: `🚨 Security Alert: Unauthorized Access Attempt - Agreement ${data.agreementId}`,
    html: emailHtml,
  });

  console.log('[verify-email] Unauthorized access alert SENT to', alertTo);
}
