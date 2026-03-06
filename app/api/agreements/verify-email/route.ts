import { NextRequest, NextResponse } from 'next/server';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendViewAlertEmail } from '@/lib/view-alert-email';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyEmailSchema.parse(body);

    // Find the agreement by token
    const agreement = await prisma.agreement.findUnique({
      where: { uniqueToken: validatedData.token },
      include: {
        client: true,
        template: true,
        event: true,
        fields: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    // Process smart fields in the HTML content
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
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, eventDate ? new Date(eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, eventType);
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, eventLocation);
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, eventStartTime);
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, eventDuration);
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, eventPackage);
      processedHtml = processedHtml.replace(/\{\{event\.price\}\}/g, packagePrice ? `$${Number(packagePrice).toFixed(2)}` : '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    // Check if email matches
    const emailMatches = agreement.client.email.toLowerCase() === validatedData.email.toLowerCase();
    
    if (emailMatches) {
      // Track view and send "Agreement Viewed" email server-side (reliable - not dependent on client)
      const clientIP = getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'Unknown';
      const isFirstView = !agreement.firstViewedAt;

      // Update view tracking in DB
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: {
          firstViewedAt: agreement.firstViewedAt || new Date(),
          lastViewedAt: new Date(),
          viewCount: agreement.viewCount + 1,
        },
      });

      // Send view alert email on first view only
      if (isFirstView) {
        const agreementForEmail = {
          ...agreement,
          viewCount: agreement.viewCount + 1,
          firstViewedAt: agreement.firstViewedAt || new Date(),
        };
        await sendViewAlertEmail(agreementForEmail, clientIP, userAgent);
      }

      // For signed agreements, use the saved snapshot to prevent changes
      // For unsigned agreements, process the template in real-time
      let processedHtml;
      if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
        // Use the saved snapshot for signed agreements
        processedHtml = agreement.mergedHtml;
      } else {
        // Process the content in real-time for unsigned agreements
        // Use customHtmlContent if available, otherwise fall back to template.htmlContent
        const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
        processedHtml = processHtmlContent(htmlToProcess, agreement.client, agreement.id, agreement.event);
      }
      
      // Email matches - allow access (serialize client for JSON - convert Decimal)
      const client = {
        ...agreement.client,
        packagePrice: agreement.client.packagePrice != null ? Number(agreement.client.packagePrice) : null,
      };
      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        agreement: {
          id: agreement.id,
          client,
          template: {
            ...agreement.template,
            htmlContent: processedHtml
          },
          status: agreement.status,
          signedAt: agreement.signedAt,
          signedFromIP: agreement.signedFromIP,
          mergedHtml: agreement.mergedHtml,
          event: agreement.event,
          fields: agreement.fields
        }
      });
    } else {
      // Email doesn't match - track unauthorized access
      const clientIP = getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'Unknown';
      
      // Record the unauthorized access attempt
      await recordUnauthorizedAccess({
        agreementId: agreement.id,
        clientEmail: agreement.client.email,
        attemptedEmail: validatedData.email,
        ipAddress: clientIP,
        userAgent: userAgent,
        timestamp: new Date()
      });

      return NextResponse.json({ 
        error: 'Email address does not match the agreement. Please check your email and try again.',
        success: false
      }, { status: 403 });
    }

  } catch (error: any) {
    console.error('Error verifying email:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to verify email' 
    }, { status: 500 });
  }
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  return 'Unknown';
}

// Track agreement view and send "Agreement Viewed" email (server-side, reliable)
async function trackAndNotifyAgreementView(
  agreement: { id: string; firstViewedAt: Date | null; viewCount: number; client: any; template: any; status: string },
  clientIP: string,
  userAgent: string
) {
  const isFirstView = !agreement.firstViewedAt;
  const now = new Date();

  await prisma.agreement.update({
    where: { id: agreement.id },
    data: {
      firstViewedAt: agreement.firstViewedAt || now,
      lastViewedAt: now,
      viewCount: agreement.viewCount + 1,
    },
  });

  if (isFirstView) {
    const agreementForEmail = {
      ...agreement,
      viewCount: agreement.viewCount + 1,
      firstViewedAt: agreement.firstViewedAt || now,
    };
    await sendViewAlertEmail(agreementForEmail, clientIP, userAgent);
  }
}

// Function to record unauthorized access attempts
async function recordUnauthorizedAccess(data: {
  agreementId: string;
  clientEmail: string;
  attemptedEmail: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}) {
  try {
    // Send email notification about unauthorized access
    await sendUnauthorizedAccessEmail(data);
    
    // Log to console for debugging
    devLog('Unauthorized access attempt:', {
      agreementId: data.agreementId,
      clientEmail: data.clientEmail,
      attemptedEmail: data.attemptedEmail,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: data.timestamp
    });
  } catch (error) {
    console.error('Failed to record unauthorized access:', error);
  }
}

// Function to send email notification about unauthorized access
async function sendUnauthorizedAccessEmail(data: {
  agreementId: string;
  clientEmail: string;
  attemptedEmail: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}) {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[verify-email] SMTP not configured - cannot send unauthorized access alert. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
    devLog('SMTP not configured - cannot send unauthorized access email');
    return;
  }

  try {
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
          
          <div style="background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">Recommended Actions:</h4>
            <ul style="margin: 0; color: #92400e;">
              <li>Review the agreement access logs</li>
              <li>Consider contacting the client if this seems suspicious</li>
              <li>Monitor for additional unauthorized access attempts</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This alert was automatically generated by the Photobooth Guys Agreement System</p>
            <p>Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const alertTo = process.env.ADMIN_EMAIL || process.env.VIEW_ALERT_EMAIL || 'agreements@photoboothguys.ca';
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: alertTo,
      subject: `🚨 Security Alert: Unauthorized Access Attempt - Agreement ${data.agreementId}`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    devLog('Unauthorized access email sent successfully');
    console.info('[verify-email] Unauthorized access alert sent to', alertTo);
  } catch (error) {
    console.error('[verify-email] Failed to send unauthorized access email:', error);
  }
}
