import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { escapeHtml } from '@/lib/htmlEscape';
import { formatDateTimeToronto, formatDateToronto } from '@/lib/dates';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { handleApiError } from '@/lib/handleApiError';
import { renderCtaButton, renderEmailLayout, renderNoticeBlock } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { getEmailGreeting } from '@/lib/email/greeting';
import { logAgreementActivity } from '@/lib/activityLog';
import { isCancelledOrVoid, isOpenForSigning } from '@/lib/agreements/signable';

const signAgreementSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Valid email is required'),
});

const getClientIP = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'Unknown';
};

// Build a "Digital Signature Details" HTML block listing all signers, used to append to the merged snapshot.
function buildSignatureBlockHtml(
  signatures: { signerName: string; signerEmail: string; signedAt: Date | string; method: string; ip?: string | null }[],
): string {
  if (!signatures.length) return '';
  const rows = signatures
    .map((s) => {
      const when = s.signedAt
        ? formatDateTimeToronto(s.signedAt)
        : '';
      return `
        <div style="margin-bottom: 12px; padding: 12px; border-left: 3px solid #3f6f4f; background-color: #FBFBF9;">
          <p style="margin: 0; font-weight: 600;">${escapeHtml(s.signerName)}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #555;">${escapeHtml(s.signerEmail)}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #777;">Signed: ${escapeHtml(when)}${s.ip ? ` &middot; IP: ${escapeHtml(s.ip)}` : ''}</p>
        </div>`;
    })
    .join('\n');

  return `
    <div style="margin-top: 32px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h3 style="margin: 0 0 12px 0;">Digital Signature Details</h3>
      ${rows}
    </div>`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signAgreementSchema.parse(body);

    // Find the agreement by token (expiry checked via shared helper below)
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
      },
      include: {
        client: true,
        template: true,
        event: true,
        signatures: true,
      }
    });

    if (!agreement) {
      return NextResponse.json({
        error: 'Agreement not found or has expired'
      }, { status: 404 });
    }

    if (agreement.status === 'SIGNED') {
      return NextResponse.json({
        error: 'This agreement has already been signed'
      }, { status: 400 });
    }

    if (isCancelledOrVoid(agreement.status)) {
      return NextResponse.json({
        error: 'This agreement has been cancelled'
      }, { status: 410 });
    }

    if (agreement.status === 'COMPLETED') {
      return NextResponse.json({
        error: 'This agreement is no longer available for signing'
      }, { status: 400 });
    }

    if (!isOpenForSigning(agreement)) {
      return NextResponse.json({
        error: 'Agreement not found or has expired'
      }, { status: 404 });
    }

    // Determine which contact this signer is (primary or secondary)
    const providedEmail = validatedData.clientEmail.trim().toLowerCase();
    const providedName = validatedData.clientName.trim().toLowerCase();

    const primaryEmail = (agreement.client.email || '').toLowerCase();
    const primaryName = `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim().toLowerCase();

    const secondSignerEnabled = Boolean(agreement.secondSignerEnabled);
    const secondaryEmail = secondSignerEnabled
      ? (agreement.secondSignerEmail || '').toLowerCase()
      : '';
    const secondaryFirstName = agreement.secondSignerFirstName || '';
    const secondaryLastName = agreement.secondSignerLastName || '';
    const secondaryName = `${secondaryFirstName} ${secondaryLastName}`.trim().toLowerCase();

    let signerRole: 'primary' | 'secondary' | null = null;
    if (providedEmail === primaryEmail && providedName === primaryName) {
      signerRole = 'primary';
    } else if (
      secondSignerEnabled &&
      secondaryEmail &&
      providedEmail === secondaryEmail &&
      providedName === secondaryName
    ) {
      signerRole = 'secondary';
    }

    if (!signerRole) {
      return NextResponse.json({
        error: 'Signer information does not match. Please verify your name and email.'
      }, { status: 400 });
    }

    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Has this signer already signed?
    const alreadySigned = agreement.signatures.some(
      (s) => (s.signerEmail || '').toLowerCase() === providedEmail,
    );
    if (alreadySigned) {
      return NextResponse.json({
        error: 'You have already signed this agreement.',
      }, { status: 400 });
    }

    const signerName = signerRole === 'primary'
      ? `${agreement.client.firstName} ${agreement.client.lastName}`.trim()
      : `${secondaryFirstName} ${secondaryLastName}`.trim();
    const signerEmail = signerRole === 'primary'
      ? agreement.client.email
      : agreement.secondSignerEmail!;

    // Exact HTML the signer saw (before the signature details block is appended)
    const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
    const baseHtml = processHtmlContent(
      htmlToProcess,
      agreement.client,
      agreement.id,
      agreement.event,
      pickSecondSigner(agreement),
    );
    const contentHash = createHash('sha256').update(baseHtml, 'utf8').digest('hex');

    // Upsert the signature row
    await prisma.signature.upsert({
      where: {
        agreementId_signerEmail: {
          agreementId: agreement.id,
          signerEmail,
        },
      },
      create: {
        agreementId: agreement.id,
        signerName,
        signerEmail,
        method: 'typed',
        signedAt: new Date(),
        ip: clientIP,
        userAgent,
        contentHash,
      },
      update: {
        signerName,
        method: 'typed',
        signedAt: new Date(),
        ip: clientIP,
        userAgent,
        contentHash,
      },
    });

    // Determine if this completes the agreement
    const requireBoth = secondSignerEnabled && Boolean(agreement.requireBothSignatures);

    // Re-read all signatures after the upsert
    const allSignatures = await prisma.signature.findMany({
      where: { agreementId: agreement.id },
      orderBy: { signedAt: 'asc' },
    });

    const primarySigned = allSignatures.some((s) => s.signerEmail.toLowerCase() === primaryEmail);
    const secondarySigned = secondaryEmail
      ? allSignatures.some((s) => s.signerEmail.toLowerCase() === secondaryEmail)
      : false;

    const isFinalSignature = requireBoth ? (primarySigned && secondarySigned) : true;
    const signerMeta = {
      signer: signerRole === 'primary' ? 'client' : 'secondSigner',
    } as const;

    let updatedAgreement;
    if (isFinalSignature) {
      const signatureBlock = requireBoth
        ? buildSignatureBlockHtml(
            allSignatures.map((s) => ({
              signerName: s.signerName,
              signerEmail: s.signerEmail,
              signedAt: s.signedAt,
              method: s.method,
              ip: s.ip,
            })),
          )
        : '';
      const signedHtmlContent = baseHtml + signatureBlock;

      devLog('🔍 SIGN API: Final signature - snapshot length:', signedHtmlContent.length);

      updatedAgreement = await prisma.agreement.update({
        where: { id: agreement.id },
        data: {
          status: 'SIGNED',
          signedAt: agreement.signedAt || new Date(),
          signedFromIP: agreement.signedFromIP || clientIP,
          mergedHtml: signedHtmlContent,
        },
        include: {
          client: true,
          template: true,
          lead: true,
          event: true,
          signatures: { orderBy: { signedAt: 'asc' } },
        },
      });

      // Update linked lead stage when agreement is fully signed
      if (updatedAgreement.leadId) {
        await prisma.lead
          .update({
            where: { id: updatedAgreement.leadId },
            data: { stage: 'SIGNED' },
          })
          .catch((err) => console.warn('Could not update lead stage:', err));
      }

      // Send notification + thank-you emails
      try {
        await sendSignedAgreementNotification(updatedAgreement, clientIP, request);
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }
      try {
        await sendClientThankYouEmail(updatedAgreement, request);
      } catch (emailError) {
        console.error('Failed to send client thank you email:', emailError);
      }

      await logAgreementActivity(agreement.id, 'SIGNED', signerMeta);
    } else {
      // Partial signature — agreement stays LIVE; record signedAt only if not yet set,
      // because mergedHtml will be finalized on the second signature.
      updatedAgreement = await prisma.agreement.update({
        where: { id: agreement.id },
        data: {
          // keep status, but bump signedAt for the first signer if missing
          signedAt: agreement.signedAt || new Date(),
          signedFromIP: agreement.signedFromIP || clientIP,
        },
        include: {
          client: true,
          template: true,
          lead: true,
          event: true,
          signatures: { orderBy: { signedAt: 'asc' } },
        },
      });

      // Email the OTHER party "waiting on you to sign"
      try {
        await sendWaitingForSecondSignerEmail(
          updatedAgreement,
          signerRole,
          request,
        );
      } catch (emailError) {
        console.error('Failed to send waiting-on-second-signer email:', emailError);
      }

      await logAgreementActivity(agreement.id, 'SIGNED_SECOND', signerMeta);
    }

    // Reshape secondSigner into the same shape verify-email returns, so the
    // client UI does not have to handle two different shapes.
    const responseAgreement = {
      ...updatedAgreement,
      secondSignerEnabled: Boolean(updatedAgreement.secondSignerEnabled),
      requireBothSignatures: Boolean(updatedAgreement.requireBothSignatures),
      secondSigner: updatedAgreement.secondSignerEnabled
        ? {
            firstName: updatedAgreement.secondSignerFirstName || '',
            lastName: updatedAgreement.secondSignerLastName || '',
            email: updatedAgreement.secondSignerEmail || '',
          }
        : null,
    };

    return NextResponse.json({
      message: isFinalSignature ? 'Agreement signed successfully' : 'Signature recorded; waiting on the other signer.',
      agreement: responseAgreement,
      isFinalSignature,
      signerRole,
    });
  } catch (error) {
    return handleApiError(error, 'agreements/sign');
  }
}

// Function to send signed agreement notification email
async function sendSignedAgreementNotification(agreement: any, clientIP: string, request: NextRequest) {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    devLog('SMTP not configured, skipping notification email');
    return;
  }

  // Get the base URL from request headers or environment
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
  const agreementUrl = `${baseUrl}/agreement/${agreement.uniqueToken}`;

  // Build a "Signed By" block — list every signer for clarity
  const signers = (agreement.signatures && agreement.signatures.length)
    ? agreement.signatures
    : [{
        signerName: `${agreement.client.firstName} ${agreement.client.lastName}`,
        signerEmail: agreement.client.email,
        signedAt: agreement.signedAt,
        ip: clientIP,
      }];

  const signersListHtml = signers
    .map((s: any) => `
      <li>
        <strong>${escapeHtml(s.signerName)}</strong> &lt;${escapeHtml(s.signerEmail)}&gt;
        — ${s.signedAt ? formatDateTimeToronto(s.signedAt) : 'N/A'}
        ${s.ip ? `(IP ${escapeHtml(s.ip)})` : ''}
      </li>`)
    .join('\n');

  const clientFirstName = escapeHtml(agreement.client.firstName);
  const clientLastName = escapeHtml(agreement.client.lastName);
  const clientEmail = escapeHtml(agreement.client.email);
  const templateTitle = escapeHtml(agreement.template.title);
  const safeClientIP = escapeHtml(clientIP);

  const secondSignerLine =
    agreement.secondSignerEnabled && agreement.secondSignerEmail
      ? `<strong>Second Signer:</strong> ${escapeHtml(agreement.secondSignerFirstName || '')} ${escapeHtml(agreement.secondSignerLastName || '')} &lt;${escapeHtml(agreement.secondSignerEmail)}&gt;<br>`
      : '';

  const agreementDetailsHtml = `
    <strong>Client:</strong> ${clientFirstName} ${clientLastName}<br>
    <strong>Email:</strong> ${clientEmail}<br>
    ${secondSignerLine}
    <strong>Template:</strong> ${templateTitle}<br>
    <strong>Agreement ID:</strong> ${agreement.id}<br>
    <strong>Signed At:</strong> ${agreement.signedAt ? formatDateTimeToronto(agreement.signedAt) : 'N/A'}<br>
    <strong>IP Address:</strong> ${safeClientIP}`;

  const signatureInfoHtml = `
    This agreement has been legally signed${signers.length > 1 ? ' by both parties' : ''}:<br>
    <ul style="margin:8px 0 0 0;padding-left:20px;">
      ${signersListHtml}
    </ul>`;

  const nextStepsHtml = `
    <ul style="margin:0;padding-left:20px;">
      <li>Review the signed agreement details above</li>
      <li>Download a PDF copy for your records</li>
      <li>Update your internal systems with the signed status</li>
      <li>Contact the client if needed: ${clientEmail}</li>
    </ul>`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;"><strong>An agreement has been digitally signed!</strong></p>
    ${renderCtaButton({ label: 'View Signed Agreement', url: agreementUrl, tone: 'default' })}
    ${renderNoticeBlock('Agreement Details', agreementDetailsHtml, 'default')}
    ${renderNoticeBlock('Digital Signature Information', signatureInfoHtml, 'default')}
    ${renderNoticeBlock('Next Steps', nextStepsHtml, 'default')}
    <p style="margin:16px 0 0 0;">This notification was automatically sent when the client completed the digital signing process.</p>
    <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#5E5E58;text-align:center;">
      Photobooth Guys Agreement Management System<br>
      Generated: ${formatDateTimeToronto(new Date())}
    </p>
  `;

  const emailHtml = renderEmailLayout({
    title: 'Agreement Signed Notification',
    preheader: 'An agreement has been digitally signed.',
    bodyHtml,
    tone: 'default',
  });

  try {
    await sendEmail({
      to: 'info@photoboothguys.ca',
      subject: `Agreement Signed - ${clientFirstName} ${clientLastName} - ${templateTitle}`,
      html: emailHtml,
    });
    devLog('Signed agreement notification sent successfully');
  } catch (error) {
    console.error('Failed to send notification email:', error);
    throw error;
  }
}

// Function to send thank you email to client
async function sendClientThankYouEmail(agreement: any, request: NextRequest) {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    devLog('SMTP not configured, skipping client thank you email');
    return;
  }

  // Get the base URL from request headers or environment
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
  const agreementUrl = `${baseUrl}/agreement/${agreement.uniqueToken}`;

  // Resolve from event first, then client (deprecated fields)
  const eventType = escapeHtml(agreement.event?.eventType ?? agreement.client.eventType ?? 'To be confirmed');
  const eventDate = agreement.event?.eventDate ?? agreement.client.eventDate;
  const eventDateText = escapeHtml(
    eventDate ? formatDateToronto(eventDate) : 'To be confirmed',
  );
  const eventPackage = escapeHtml(agreement.event?.eventPackage ?? agreement.client.eventPackage ?? 'Standard Package');
  const packagePrice = agreement.event?.packagePrice ?? agreement.client.packagePrice;
  const clientGreeting = escapeHtml(getEmailGreeting(agreement.client));
  const clientEmail = escapeHtml(agreement.client.email);
  const portalUrl = `${baseUrl}/portal/login`;

  const agreementDetailsHtml = `
    <strong>Event Type:</strong> ${eventType}<br>
    <strong>Event Date:</strong> ${eventDateText}<br>
    <strong>Package:</strong> ${eventPackage}<br>
    ${packagePrice ? `<strong>Investment:</strong> $${Number(packagePrice).toFixed(2)}<br>` : ''}
    <strong>Agreement ID:</strong> ${agreement.id}<br>
    <strong>Signed On:</strong> ${agreement.signedAt ? formatDateTimeToronto(agreement.signedAt) : 'N/A'}`;

  const nextStepsHtml = `
    <ul style="margin:0;padding-left:20px;">
      <li><strong>Client Portal Access:</strong> Use your email to access your personal portal for managing all event details</li>
      <li><strong>Template Selection:</strong> Choose your photo booth template to match your event theme</li>
      <li><strong>Event Planning:</strong> We'll be in touch closer to your event date to finalize details</li>
      <li><strong>Questions:</strong> Don't hesitate to reach out if you have any questions</li>
    </ul>`;

  const portalInfoHtml = `
    Access your personal client portal using your email address (${clientEmail}) to:<br>
    <ul style="margin:8px 0 0 0;padding-left:20px;">
      <li>View all your agreements and their current status</li>
      <li>Track payment information and make payments online</li>
      <li>Access your event gallery when photos are ready</li>
      <li>Update your event details and preferences</li>
      <li>Download copies of signed agreements anytime</li>
    </ul>`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Thank you, ${clientGreeting}! Your agreement has been successfully signed and we're excited to work with you!</p>
    <p style="margin:0 0 16px 0;">Dear ${clientGreeting},</p>
    <p style="margin:0 0 16px 0;">Thank you for choosing <strong>Photobooth Guys</strong> for your special event! We're thrilled to be part of your celebration and look forward to creating amazing memories together.</p>
    ${renderNoticeBlock('Your Agreement Details', agreementDetailsHtml, 'default')}
    ${renderCtaButton({ label: 'View Your Agreement', url: agreementUrl, tone: 'default' })}
    ${renderNoticeBlock("What's Next?", nextStepsHtml, 'default')}
    ${renderNoticeBlock('Your Client Portal', `${portalInfoHtml}<p style="margin:16px 0 0 0;"><a href="${portalUrl}" style="color:#1E3B31;text-decoration:underline;font-weight:600;">Open Client Portal</a></p>`, 'default')}
    ${renderNoticeBlock('Need Help or Have Questions?', `
      Our team is here to help make your event perfect!<br>
      <strong>Email:</strong> info@photoboothguys.ca<br>
      <strong>Phone:</strong> 647-378-5332<br>
      <strong>Website:</strong> <a href="https://photoboothguys.ca" style="color:#1E3B31;text-decoration:underline;">photoboothguys.ca</a>
    `, 'default')}
    <p style="margin:16px 0 0 0;">Once again, thank you for choosing Photobooth Guys. We can't wait to make your event unforgettable!</p>
    <p style="margin:16px 0 0 0;">Best regards,<br><strong>The Photobooth Guys Team</strong></p>
    <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#5E5E58;text-align:center;">
      Generated: ${formatDateTimeToronto(new Date())}
    </p>
  `;

  const emailHtml = renderEmailLayout({
    title: 'Thank You for Choosing Us',
    preheader: 'Your agreement has been successfully signed.',
    bodyHtml,
    tone: 'default',
  });

  const ccList: string[] = [];
  if (
    agreement.secondSignerEnabled &&
    agreement.secondSignerEmail &&
    agreement.secondSignerEmail.toLowerCase() !== (agreement.client.email || '').toLowerCase()
  ) {
    ccList.push(agreement.secondSignerEmail);
  }

  try {
    await sendEmail({
      to: agreement.client.email,
      cc: ccList.length > 0 ? ccList : undefined,
      subject: `Agreement Signed - Thank You for Choosing Photobooth Guys`,
      html: emailHtml,
    });
    devLog('Client thank you email sent successfully to:', agreement.client.email, 'cc:', ccList.length ? ccList : 'none');
  } catch (error) {
    console.error('Failed to send client thank you email:', error);
    throw error;
  }
}

// Email the OTHER signer that we are waiting on them to sign.
async function sendWaitingForSecondSignerEmail(
  agreement: any,
  signerJustSigned: 'primary' | 'secondary',
  request: NextRequest,
) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    devLog('SMTP not configured, skipping waiting-on-second-signer email');
    return;
  }

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
  const agreementUrl = `${baseUrl}/agreement/${agreement.uniqueToken}`;

  // Determine recipient (the OTHER party)
  const recipientEmail = signerJustSigned === 'primary'
    ? agreement.secondSignerEmail
    : agreement.client.email;
  const recipientName = signerJustSigned === 'primary'
    ? `${agreement.secondSignerFirstName || ''} ${agreement.secondSignerLastName || ''}`.trim() || 'there'
    : getEmailGreeting(agreement.client) || 'there';

  const justSignedName = signerJustSigned === 'primary'
    ? `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim()
    : `${agreement.secondSignerFirstName || ''} ${agreement.secondSignerLastName || ''}`.trim();

  if (!recipientEmail) {
    devLog('No recipient email for waiting-on-second-signer email; skipping');
    return;
  }

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 16px 0;">${escapeHtml(justSignedName)} has signed the agreement, and this agreement requires both signatures to be binding.</p>
    ${renderNoticeBlock('Action Required', '<strong>Please review and sign the agreement to complete the process.</strong>', 'default')}
    ${renderCtaButton({ label: 'Review & Sign', url: agreementUrl, tone: 'default' })}
    <p style="margin:16px 0 0 0;">If you have any questions, just reply to this email or contact us at info@photoboothguys.ca.</p>
    <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#5E5E58;text-align:center;">
      Photobooth Guys Agreement Management System<br>
      Generated: ${formatDateTimeToronto(new Date())}
    </p>
  `;

  const emailHtml = renderEmailLayout({
    title: 'Your signature is needed',
    preheader: 'Please review and sign the agreement to complete the process.',
    bodyHtml,
    tone: 'default',
  });

  await sendEmail({
    to: recipientEmail,
    subject: `Action needed: please sign the agreement`,
    html: emailHtml,
  });
  devLog('Waiting-on-second-signer email sent to:', recipientEmail);
}
