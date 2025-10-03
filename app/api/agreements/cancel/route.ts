import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const cancelAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
  adminName: z.string().min(1, 'Admin name is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = cancelAgreementSchema.parse(body);

    // Find the agreement
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      include: {
        client: true,
        template: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    // Only allow cancellation of SIGNED agreements
    if (agreement.status !== 'SIGNED') {
      return NextResponse.json({ 
        error: 'Only signed agreements can be cancelled' 
      }, { status: 400 });
    }

    // Update agreement status to CANCELLED
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: validatedData.adminName,
        cancellationReason: validatedData.cancellationReason
      },
      include: {
        client: true,
        template: true
      }
    });

    // Send cancellation email to client
    try {
      await sendCancellationEmail(updatedAgreement, validatedData.cancellationReason, validatedData.adminName, request);
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the cancellation process if email fails
    }

    return NextResponse.json({
      message: 'Agreement cancelled successfully',
      agreement: updatedAgreement
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error cancelling agreement:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel agreement' 
    }, { status: 500 });
  }
}

// Function to send cancellation email to client
async function sendCancellationEmail(agreement: any, reason: string, adminName: string, request: NextRequest) {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP not configured, skipping cancellation email');
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
        .header h1 { color: #dc2626; margin: 0; }
        .content { margin-bottom: 30px; }
        .cancellation-notice { 
          border: 2px solid #dc2626; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          background-color: #fef2f2;
        }
        .agreement-details { 
          border: 1px solid #eee; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          background-color: #f9f9f9;
        }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
        .important { background-color: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Photobooth Guys</h1>
          <p>Agreement Cancellation Notice</p>
        </div>
        
        <div class="content">
          <div class="cancellation-notice">
            <h2 style="color: #dc2626; margin-top: 0;">⚠️ AGREEMENT CANCELLED</h2>
            <p><strong>Your service agreement has been cancelled by Photobooth Guys.</strong></p>
          </div>
          
          <p>Dear ${agreement.client.firstName} ${agreement.client.lastName},</p>
          
          <p>We are writing to inform you that your service agreement has been cancelled. This action was taken by our administration team and is effective immediately.</p>
          
          <div class="agreement-details">
            <h3>Agreement Details:</h3>
            <p><strong>Client:</strong> ${agreement.client.firstName} ${agreement.client.lastName}</p>
            <p><strong>Email:</strong> ${agreement.client.email}</p>
            <p><strong>Template:</strong> ${agreement.template.title}</p>
            <p><strong>Agreement ID:</strong> ${agreement.id}</p>
            <p><strong>Originally Signed:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}</p>
            <p><strong>Cancelled On:</strong> ${agreement.cancelledAt ? new Date(agreement.cancelledAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}</p>
            <p><strong>Cancelled By:</strong> ${adminName}</p>
            <p><strong>Reason:</strong> ${reason}</p>
          </div>
          
          <div class="important">
            <h3>Important Information:</h3>
            <ul>
              <li>This agreement is now null and void</li>
              <li>All terms and conditions are no longer in effect</li>
              <li>Any services scheduled under this agreement are cancelled</li>
              <li>If you have any questions, please contact us immediately</li>
            </ul>
          </div>
          
          <p>If you believe this cancellation was made in error, or if you have any questions about this matter, please contact us immediately at <strong>info@photoboothguys.ca</strong>.</p>
          
          <p>We apologize for any inconvenience this may cause.</p>
          
          <p>Best regards,<br>
          <strong>Photobooth Guys Administration</strong></p>
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
    to: agreement.client.email,
    subject: `Agreement Cancelled - ${agreement.client.firstName} ${agreement.client.lastName} - ${agreement.template.title}`,
    html: emailHtml,
  };

  try {
    await transporter.verify();
    await transporter.sendMail(mailOptions);
    console.log('Cancellation email sent successfully');
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
    throw error;
  }
}
