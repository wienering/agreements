import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
        fields: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    // Check if email matches
    const emailMatches = agreement.client.email.toLowerCase() === validatedData.email.toLowerCase();
    
    if (emailMatches) {
      // Email matches - allow access
      return NextResponse.json({
        success: true,
        message: 'Email verified successfully',
        agreement: {
          id: agreement.id,
          client: agreement.client,
          template: agreement.template,
          status: agreement.status,
          signedAt: agreement.signedAt,
          signedFromIP: agreement.signedFromIP,
          mergedHtml: agreement.mergedHtml,
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
    console.log('Unauthorized access attempt:', {
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
    console.log('SMTP not configured - cannot send unauthorized access email');
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

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'agreements@photoboothguys.ca',
      subject: `🚨 Security Alert: Unauthorized Access Attempt - Agreement ${data.agreementId}`,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log('Unauthorized access email sent successfully');
  } catch (error) {
    console.error('Failed to send unauthorized access email:', error);
  }
}
