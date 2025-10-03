import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
        template: true
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
    const processHtmlContent = (html: string, client: any, agreementId: string) => {
      let processedHtml = html;
      
      // Replace client fields
      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, client.eventDate ? new Date(client.eventDate).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '');
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
      
      // Replace event fields
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, client.eventType || '');
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, client.eventLocation || '');
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, client.eventStartTime || '');
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, client.eventDuration || '');
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, client.eventPackage || '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }));
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    // Create a snapshot of the agreement content at the time of signing
    const signedHtmlContent = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id);

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
        template: true
      }
    });

    // Send automatic notification email to info@photoboothguys.ca
    try {
      await sendSignedAgreementNotification(updatedAgreement, clientIP, request);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
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
    console.log('SMTP not configured, skipping notification email');
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
    console.log('Signed agreement notification sent successfully');
  } catch (error) {
    console.error('Failed to send notification email:', error);
    throw error;
  }
}
