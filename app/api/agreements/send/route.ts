import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const sendAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendAgreementSchema.parse(body);

    // Find the agreement with client and template data
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

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ 
        error: 'Email service is not configured. Please contact support to set up email functionality.',
        fallback: {
          clientLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/agreement/${agreement.uniqueToken}`,
          message: 'You can copy and share this link with your client instead.'
        }
      }, { status: 503 });
    }

    // Process smart fields in the HTML content
    const processHtmlContent = (html: string, client: any, agreementId: string) => {
      let processedHtml = html;
      
      // Replace client fields
      processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
      processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
      processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
      processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
      processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, client.eventDate ? new Date(client.eventDate).toLocaleDateString() : '');
      processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');
      
      // Replace event fields
      processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, client.eventType || '');
      processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, client.eventLocation || '');
      processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, client.eventStartTime || '');
      processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, client.eventDuration || '');
      processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, client.eventPackage || '');
      
      // Replace agreement fields
      processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
      processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');
      
      return processedHtml;
    };

    const processedHtml = processHtmlContent(agreement.template.htmlContent, agreement.client, agreement.id);
    const clientLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/agreement/${agreement.uniqueToken}`;

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
          .agreement-preview { 
            border: 1px solid #eee; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            background-color: #f9f9f9;
          }
          .button { 
            display: inline-block; 
            background-color: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 10px 5px;
            font-weight: 500;
          }
          .button:hover { background-color: #2563eb; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
          .urgent { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Service Agreement Ready for Review</p>
          </div>
          
          <div class="content">
            <p>Dear ${agreement.client.firstName} ${agreement.client.lastName},</p>
            
            <p>Your service agreement is ready for review and digital signature. Please click the button below to access your agreement.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${clientLink}" class="button">Review & Sign Agreement</a>
            </div>
            
            <div class="urgent">
              <strong>⏰ Important:</strong> This agreement expires on ${agreement.expiresAt ? new Date(agreement.expiresAt).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : 'the specified date'}. Please review and sign before the expiration date.
            </div>
            
            <h3>Agreement Preview:</h3>
            <div class="agreement-preview">
              ${processedHtml.substring(0, 500)}${processedHtml.length > 500 ? '...' : ''}
            </div>
            
            <p>To view the complete agreement and sign it digitally, please click the button above.</p>
            
            <h3>What happens next?</h3>
            <ul>
              <li>Review the complete agreement terms and conditions</li>
              <li>Verify all information is correct</li>
              <li>Sign the agreement digitally using your email confirmation</li>
              <li>Download a copy of your signed agreement</li>
            </ul>
            
            <p>If you have any questions about this agreement, please contact us at info@photoboothguys.ca</p>
          </div>
          
          <div class="footer">
            <p>This email was sent by Photobooth Guys Agreement Management System</p>
            <p>Agreement ID: ${agreement.id} | Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with timeout and error handling
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: agreement.client.email,
      subject: `Service Agreement Ready for Review - ${agreement.template.title}`,
      html: emailHtml,
    };

    try {
      // Verify connection first
      await transporter.verify();
      
      // Send email with timeout
      const info = await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email send timeout')), 15000)
        )
      ]);

      console.log('Agreement email sent successfully:', info);

      // Update agreement status to LIVE if it was DRAFT
      if (agreement.status === 'DRAFT') {
        await prisma.agreement.update({
          where: { id: agreement.id },
          data: { status: 'LIVE' }
        });
      }

      return NextResponse.json({
        message: 'Agreement sent successfully',
        recipientEmail: agreement.client.email,
        agreementId: agreement.id,
        status: 'LIVE'
      });
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      // Return fallback information
      return NextResponse.json({ 
        error: 'Failed to send email. Please try again later or use the copy link feature.',
        fallback: {
          clientLink: clientLink,
          message: 'You can copy and share this link with your client instead.'
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error sending agreement:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to send agreement' 
    }, { status: 500 });
  }
}
