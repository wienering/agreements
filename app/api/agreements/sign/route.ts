import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const signAgreementSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Valid email is required'),
});

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
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found or has expired' 
      }, { status: 404 });
    }

    // Verify client information matches
    const clientName = `${agreement.client.firstName} ${agreement.client.lastName}`.toLowerCase();
    const providedName = validatedData.clientName.toLowerCase();
    const clientEmail = agreement.client.email.toLowerCase();
    const providedEmail = validatedData.clientEmail.toLowerCase();

    if (clientName !== providedName || clientEmail !== providedEmail) {
      return NextResponse.json({ 
        error: 'Client information does not match. Please verify your name and email.' 
      }, { status: 400 });
    }

    // Check if already signed
    if (agreement.status === 'SIGNED') {
      return NextResponse.json({ 
        error: 'This agreement has already been signed' 
      }, { status: 400 });
    }

    // Get client IP address
    const getClientIP = (request: NextRequest): string => {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIP = request.headers.get('x-real-ip');
      const cfConnectingIP = request.headers.get('cf-connecting-ip');
      
      if (cfConnectingIP) return cfConnectingIP;
      if (realIP) return realIP;
      if (forwarded) return forwarded.split(',')[0].trim();
      
      return 'Unknown';
    };

    const clientIP = getClientIP(request);

    // Process and save the HTML content as a snapshot
    const processHtmlContent = (html: string, client: any, agreementId: string, event: any = null) => {
      let processedHtml = html;
      
      // Extract address and notes from event if available, otherwise use client data
      const address = event ? (event.eventLocation ?? '') : (client.address || '');
      const notes = event ? (event.notes ?? '') : (client.notes || '');
      
      // Replace client fields
      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
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
      
      // Replace event fields - use event data if available, otherwise client fields
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '');
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
      processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, packagePrice ? `$${Number(packagePrice).toFixed(2)}` : '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }));
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    // Create a snapshot of the agreement content at the time of signing
    // Use customHtmlContent if available, otherwise fall back to template.htmlContent
    const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
    const signedHtmlContent = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event);
    devLog('🔍 SIGN API: Created snapshot length:', signedHtmlContent.length);
    devLog('🔍 SIGN API: Snapshot preview:', signedHtmlContent.substring(0, 200) + '...');

    // Update agreement status to SIGNED and save the snapshot
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedFromIP: clientIP,
        mergedHtml: signedHtmlContent // Save the processed HTML as a snapshot
      },
      include: {
        client: true,
        template: true,
        lead: true
      }
    });

    // Update linked lead stage when agreement is signed
    if (updatedAgreement.leadId) {
      await prisma.lead.update({
        where: { id: updatedAgreement.leadId },
        data: { stage: 'SIGNED' },
      }).catch((err) => console.warn('Could not update lead stage:', err));
    }

    // Send automatic notification email to info@photoboothguys.ca
    try {
      await sendSignedAgreementNotification(updatedAgreement, clientIP, request);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the signing process if email fails
    }

    // Send thank you email to the client
    try {
      await sendClientThankYouEmail(updatedAgreement, request);
    } catch (emailError) {
      console.error('Failed to send client thank you email:', emailError);
      // Don't fail the signing process if email fails
    }

    return NextResponse.json({
      message: 'Agreement signed successfully',
      agreement: updatedAgreement
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

  // Create email content
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #3b82f6; margin: 0; }
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
          background-color: #2563eb !important; 
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
            <p><strong>Template:</strong> ${agreement.template.title}</p>
            <p><strong>Agreement ID:</strong> ${agreement.id}</p>
            <p><strong>Signed At:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}</p>
            <p><strong>IP Address:</strong> ${clientIP}</p>
          </div>
          
          <div class="signature-info">
            <h3>Digital Signature Information:</h3>
            <p>This agreement has been legally signed by the client using their email verification. The signature includes:</p>
            <ul>
              <li>Client identity verification</li>
              <li>Timestamp of signing (Toronto timezone)</li>
              <li>IP address of signing location</li>
              <li>Unique agreement identifier</li>
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
  const mailOptions = {
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
        .header h1 { color: #3b82f6; margin: 0; }
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
          background-color: #2563eb !important; 
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
            <p><strong>Event Type:</strong> ${agreement.client.eventType || 'To be confirmed'}</p>
            <p><strong>Event Date:</strong> ${agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : 'To be confirmed'}</p>
            <p><strong>Package:</strong> ${agreement.client.eventPackage || 'Standard Package'}</p>
            ${agreement.client.packagePrice ? `<p><strong>Investment:</strong> $${Number(agreement.client.packagePrice).toFixed(2)}</p>` : ''}
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
            <a href="${baseUrl}/portal/login" class="button" style="background-color: #10b981 !important;">Access Client Portal</a>
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
              <a href="${baseUrl}/portal/login" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Client Portal →</a>
            </p>
          </div>
          
          <div class="contact-info">
            <h3>Need Help or Have Questions?</h3>
            <p>Our team is here to help make your event perfect!</p>
            <p><strong>📧 Email:</strong> info@photoboothguys.ca</p>
            <p><strong>📞 Phone:</strong> 647-378-5332</p>
            <p><strong>🌐 Website:</strong> <a href="https://photoboothguys.ca" style="color: #3b82f6;">photoboothguys.ca</a></p>
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

  // Send email
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: agreement.client.email,
    subject: `Agreement Signed - Thank You for Choosing Photobooth Guys`,
    html: emailHtml,
  };

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    devLog('Client thank you email sent successfully to:', agreement.client.email);
  } catch (error) {
    console.error('Failed to send client thank you email:', error);
    throw error;
  }
}
