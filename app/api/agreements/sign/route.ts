import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { applySignerSmartFields, pickSecondSigner } from '@/lib/agreementSmartFields';

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

// Process and save the HTML content as a snapshot
const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null, agreement: any = null) => {
  let processedHtml = applySignerSmartFields(html, client, pickSecondSigner(agreement));

  // Extract address and notes from event if available, otherwise use client data
  const address = event ? (event.eventLocation ?? '') : (client.address || '');
  const notes = event ? (event.notes ?? '') : (client.notes || '');

  processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, address);
  processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, notes);

  // Use event data exclusively when event exists, otherwise fall back to client event fields (backward compatibility)
  const eventDate = event ? event.eventDate : client.eventDate;
  const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
  const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
  const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
  const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
  const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
  const packagePrice = event ? event.packagePrice : client.packagePrice;

  processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '');
  processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
  processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
  processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
  processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
  processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
  processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, packagePrice ? `$${Number(packagePrice).toFixed(2)}` : '');

  processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }));
  processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');

  return processedHtml;
};

// Build a "Digital Signature Details" HTML block listing all signers, used to append to the merged snapshot.
function buildSignatureBlockHtml(
  signatures: { signerName: string; signerEmail: string; signedAt: Date | string; method: string; ip?: string | null }[],
): string {
  if (!signatures.length) return '';
  const rows = signatures
    .map((s) => {
      const when = s.signedAt
        ? new Date(s.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' })
        : '';
      return `
        <div style="margin-bottom: 12px; padding: 12px; border-left: 3px solid #4a9e72; background-color: #f8fafc;">
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

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signAgreementSchema.parse(body);

    // Find the agreement by token
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        expiresAt: {
          gte: new Date()
        }
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

    // Determine which contact this signer is (primary or secondary)
    const providedEmail = validatedData.clientEmail.trim().toLowerCase();
    const providedName = validatedData.clientName.trim().toLowerCase();

    const primaryEmail = (agreement.client.email || '').toLowerCase();
    const primaryName = `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim().toLowerCase();

    const secondSignerEnabled = Boolean((agreement as any).secondSignerEnabled);
    const secondaryEmail = secondSignerEnabled
      ? ((agreement as any).secondSignerEmail || '').toLowerCase()
      : '';
    const secondaryFirstName = (agreement as any).secondSignerFirstName || '';
    const secondaryLastName = (agreement as any).secondSignerLastName || '';
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

    // Check if already SIGNED — no further signatures may be recorded
    if (agreement.status === 'SIGNED') {
      return NextResponse.json({
        error: 'This agreement has already been signed'
      }, { status: 400 });
    }

    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Has this signer already signed?
    const existingSignatures = (agreement as any).signatures || [];
    const alreadySigned = existingSignatures.some(
      (s: any) => (s.signerEmail || '').toLowerCase() === providedEmail,
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
      : (agreement as any).secondSignerEmail;

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
      },
      update: {
        signerName,
        method: 'typed',
        signedAt: new Date(),
        ip: clientIP,
        userAgent,
      },
    });

    // Determine if this completes the agreement
    const requireBoth = secondSignerEnabled && Boolean((agreement as any).requireBothSignatures);

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

    let updatedAgreement: any;
    if (isFinalSignature) {
      // Build the merged snapshot from primary client's perspective and append signature blocks.
      const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
      const baseHtml = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event, agreement);
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
    }

    // Reshape secondSigner into the same shape verify-email returns, so the
    // client UI does not have to handle two different shapes.
    const responseAgreement = {
      ...updatedAgreement,
      secondSignerEnabled: Boolean((updatedAgreement as any).secondSignerEnabled),
      requireBothSignatures: Boolean((updatedAgreement as any).requireBothSignatures),
      secondSigner: (updatedAgreement as any).secondSignerEnabled
        ? {
            firstName: (updatedAgreement as any).secondSignerFirstName || '',
            lastName: (updatedAgreement as any).secondSignerLastName || '',
            email: (updatedAgreement as any).secondSignerEmail || '',
          }
        : null,
    };

    return NextResponse.json({
      message: isFinalSignature ? 'Agreement signed successfully' : 'Signature recorded; waiting on the other signer.',
      agreement: responseAgreement,
      isFinalSignature,
      signerRole,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    console.error('Error signing agreement:', error);
    return NextResponse.json({
      error: 'Failed to sign agreement'
    }, { status: 500 });
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

  // Create email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

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
        — ${s.signedAt ? new Date(s.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}
        ${s.ip ? `(IP ${escapeHtml(s.ip)})` : ''}
      </li>`)
    .join('\n');

  // Create email content
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #4a9e72; margin: 0; }
        .content { margin-bottom: 30px; }
        .agreement-details { 
          border: 1px solid #eee; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          background-color: #f9f9f9;
        }
        .button { 
          display: inline-block; 
          background-color: #3d8560 !important; 
          color: white !important; 
          padding: 18px 36px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 10px 5px;
          font-weight: 700;
          font-size: 18px;
          font-family: Arial, sans-serif;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: none;
          transition: all 0.2s ease;
          min-width: 220px;
          text-shadow: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: 0.5px;
        }
        .button:hover { 
          background-color: #1d4ed8; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          transform: translateY(-1px);
        }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
        .urgent { background-color: #dbeafe; border: 1px solid #93c5fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .signature-info { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Photobooth Guys</h1>
          <p>Agreement Signed Notification</p>
        </div>
        
        <div class="content">
          <p><strong>An agreement has been digitally signed!</strong></p>
          
          <div class="agreement-details">
            <h3>Agreement Details:</h3>
            <p><strong>Client:</strong> ${agreement.client.firstName} ${agreement.client.lastName}</p>
            <p><strong>Email:</strong> ${agreement.client.email}</p>
            ${agreement.secondSignerEnabled && agreement.secondSignerEmail
              ? `<p><strong>Second Signer:</strong> ${escapeHtml(agreement.secondSignerFirstName || '')} ${escapeHtml(agreement.secondSignerLastName || '')} &lt;${escapeHtml(agreement.secondSignerEmail)}&gt;</p>`
              : ''}
            <p><strong>Template:</strong> ${agreement.template.title}</p>
            <p><strong>Agreement ID:</strong> ${agreement.id}</p>
            <p><strong>Signed At:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}</p>
            <p><strong>IP Address:</strong> ${clientIP}</p>
          </div>
          
          <div class="signature-info">
            <h3>Digital Signature Information:</h3>
            <p>This agreement has been legally signed${signers.length > 1 ? ' by both parties' : ''}:</p>
            <ul>
              ${signersListHtml}
            </ul>
          </div>
          
          <div class="urgent">
            <strong>📋 Next Steps:</strong>
            <ul>
              <li>Review the signed agreement details above</li>
              <li>Download a PDF copy for your records</li>
              <li>Update your internal systems with the signed status</li>
              <li>Contact the client if needed: ${agreement.client.email}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${agreementUrl}" class="button">View Signed Agreement</a>
          </div>
          
          <p>This notification was automatically sent when the client completed the digital signing process.</p>
        </div>
        
        <div class="footer">
          <p>Photobooth Guys Agreement Management System</p>
          <p>Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email
  const mailOptions: any = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: 'info@photoboothguys.ca',
    subject: `Agreement Signed - ${agreement.client.firstName} ${agreement.client.lastName} - ${agreement.template.title}`,
    html: emailHtml,
  };

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
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
  const eventType = agreement.event?.eventType ?? agreement.client.eventType ?? 'To be confirmed';
  const eventDate = agreement.event?.eventDate ?? agreement.client.eventDate;
  const eventPackage = agreement.event?.eventPackage ?? agreement.client.eventPackage ?? 'Standard Package';
  const packagePrice = agreement.event?.packagePrice ?? agreement.client.packagePrice;

  // Create email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  // Create email content
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #4a9e72; margin: 0; }
        .content { margin-bottom: 30px; }
        .agreement-details { 
          border: 1px solid #eee; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          background-color: #f9f9f9;
        }
        .button { 
          display: inline-block; 
          background-color: #3d8560 !important; 
          color: white !important; 
          padding: 18px 36px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 10px 5px;
          font-weight: 700;
          font-size: 18px;
          font-family: Arial, sans-serif;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: none;
          transition: all 0.2s ease;
          min-width: 220px;
          text-shadow: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: 0.5px;
        }
        .button:hover { 
          background-color: #1d4ed8; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          transform: translateY(-1px);
        }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
        .thank-you { background-color: #dbeafe; border: 1px solid #93c5fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .next-steps { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .contact-info { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Photobooth Guys</h1>
          <p>Thank You for Choosing Us!</p>
        </div>
        
        <div class="content">
          <div class="thank-you">
            <h2 style="margin: 0 0 16px 0; color: #1e40af; font-size: 28px;">🎉 Thank You, ${agreement.client.firstName}!</h2>
            <p style="margin: 0; font-size: 18px; color: #1e40af; font-weight: 600;">
              Your agreement has been successfully signed and we're excited to work with you!
            </p>
          </div>
          
          <p>Dear ${agreement.client.firstName},</p>
          
          <p>Thank you for choosing <strong>Photobooth Guys</strong> for your special event! We're thrilled to be part of your celebration and look forward to creating amazing memories together.</p>
          
          <div class="agreement-details">
            <h3>Your Agreement Details:</h3>
            <p><strong>Event Type:</strong> ${eventType}</p>
            <p><strong>Event Date:</strong> ${eventDate ? new Date(eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : 'To be confirmed'}</p>
            <p><strong>Package:</strong> ${eventPackage}</p>
            ${packagePrice ? `<p><strong>Investment:</strong> $${Number(packagePrice).toFixed(2)}</p>` : ''}
            <p><strong>Agreement ID:</strong> ${agreement.id}</p>
            <p><strong>Signed On:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}</p>
          </div>
          
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li><strong>Client Portal Access:</strong> Use your email to access your personal portal for managing all event details</li>
              <li><strong>Template Selection:</strong> Choose your photo booth template to match your event theme</li>
              <li><strong>Event Planning:</strong> We'll be in touch closer to your event date to finalize details</li>
              <li><strong>Questions:</strong> Don't hesitate to reach out if you have any questions</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${agreementUrl}" class="button">View Your Agreement</a>
            <a href="${baseUrl}/portal/login" class="button" style="background-color: #4a9e72 !important;">Access Client Portal</a>
          </div>
          
          <div class="contact-info">
            <h3>Your Client Portal</h3>
            <p>Access your personal client portal using your email address (${agreement.client.email}) to:</p>
            <ul>
              <li>View all your agreements and their current status</li>
              <li>Track payment information and make payments online</li>
              <li>Access your event gallery when photos are ready</li>
              <li>Update your event details and preferences</li>
              <li>Download copies of signed agreements anytime</li>
            </ul>
            <p style="text-align: center; margin: 20px 0;">
              <a href="${baseUrl}/portal/login" style="display: inline-block; background-color: #4a9e72; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Client Portal →</a>
            </p>
          </div>
          
          <div class="contact-info">
            <h3>Need Help or Have Questions?</h3>
            <p>Our team is here to help make your event perfect!</p>
            <p><strong>📧 Email:</strong> info@photoboothguys.ca</p>
            <p><strong>📞 Phone:</strong> 647-378-5332</p>
            <p><strong>🌐 Website:</strong> <a href="https://photoboothguys.ca" style="color: #4a9e72;">photoboothguys.ca</a></p>
          </div>
          
          <p>Once again, thank you for choosing Photobooth Guys. We can't wait to make your event unforgettable!</p>
          
          <p>Best regards,<br>
          <strong>The Photobooth Guys Team</strong></p>
        </div>
        
        <div class="footer">
          <p>Photobooth Guys</p>
          <p>Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email — CC second signer when enabled and email is different from primary
  const mailOptions: any = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: agreement.client.email,
    subject: `Agreement Signed - Thank You for Choosing Photobooth Guys`,
    html: emailHtml,
  };

  if (
    agreement.secondSignerEnabled &&
    agreement.secondSignerEmail &&
    agreement.secondSignerEmail.toLowerCase() !== (agreement.client.email || '').toLowerCase()
  ) {
    mailOptions.cc = [agreement.secondSignerEmail];
  }

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    devLog('Client thank you email sent successfully to:', agreement.client.email, 'cc:', mailOptions.cc || 'none');
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
    : `${agreement.client.firstName || ''}`.trim() || 'there';

  const justSignedName = signerJustSigned === 'primary'
    ? `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim()
    : `${agreement.secondSignerFirstName || ''} ${agreement.secondSignerLastName || ''}`.trim();

  if (!recipientEmail) {
    devLog('No recipient email for waiting-on-second-signer email; skipping');
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
        .header h1 { color: #4a9e72; margin: 0; }
        .info { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .button {
          display: inline-block;
          background-color: #3d8560;
          color: white !important;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
        }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Photobooth Guys</h1>
          <p>Your signature is needed</p>
        </div>
        <p>Hi ${escapeHtml(recipientName)},</p>
        <p>${escapeHtml(justSignedName)} has signed the agreement, and this agreement requires both signatures to be binding.</p>
        <div class="info">
          <p style="margin: 0;"><strong>Please review and sign the agreement to complete the process.</strong></p>
        </div>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${agreementUrl}" class="button">Review &amp; Sign Agreement</a>
        </p>
        <p>If you have any questions, just reply to this email or contact us at info@photoboothguys.ca.</p>
        <div class="footer">
          <p>Photobooth Guys Agreement Management System</p>
          <p>Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions: any = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipientEmail,
    subject: `Action needed: please sign the agreement`,
    html: emailHtml,
  };

  await transporter.verify();
  await transporter.sendMail(mailOptions);
  devLog('Waiting-on-second-signer email sent to:', recipientEmail);
}
