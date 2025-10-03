import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const emailRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  recipientEmail: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = emailRequestSchema.parse(body);

    // Find the agreement by token
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        status: 'SIGNED' // Only allow email for signed agreements
      },
      include: {
        client: true,
        template: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Signed agreement not found or has expired' 
      }, { status: 404 });
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

    // Get the base URL from request headers or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ 
        error: 'Email service is not configured. Please contact support to set up email functionality.' 
      }, { status: 503 });
    }

    // Create email transporter (using environment variables for SMTP)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    });

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Signed Agreement - ${agreement.client.firstName} ${agreement.client.lastName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              color: #333;
              background: #f4f4f4;
            }
            .email-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: #2563eb;
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 10px 0 0 0;
              opacity: 0.9;
            }
            .content {
              padding: 30px;
            }
            .agreement-content {
              font-size: 14px;
              line-height: 1.8;
              margin-bottom: 30px;
            }
            .signature-info {
              background: #f8fafc;
              padding: 20px;
              border-radius: 6px;
              border-left: 4px solid #10b981;
              margin: 20px 0;
            }
            .footer {
              background: #f8fafc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .button {
              display: inline-block;
              background: #1e40af;
              color: white;
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
              background: #1d4ed8;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>Photobooth Guys</h1>
              <p>Signed Service Agreement</p>
            </div>
            
            <div class="content">
              <h2>Hello ${agreement.client.firstName},</h2>
              <p>Thank you for signing your service agreement! Please find a copy of your signed agreement below.</p>
              
              <div class="signature-info">
                <h3>Agreement Details</h3>
                <p><strong>Client:</strong> ${agreement.client.firstName} ${agreement.client.lastName}</p>
                <p><strong>Email:</strong> ${agreement.client.email}</p>
                <p><strong>Date Signed:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Agreement ID:</strong> ${agreement.id}</p>
              </div>
              
              <div class="agreement-content">
                ${processedHtml}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/agreement/${validatedData.token}" class="button">View Online</a>
                <a href="${baseUrl}/api/agreements/pdf" class="button">Download PDF</a>
              </div>
            </div>
            
            <div class="footer">
              <p>This document was digitally signed and is legally binding.</p>
              <p>If you have any questions, please contact us at info@photoboothguys.ca</p>
              <p>© ${new Date().getFullYear()} Photobooth Guys. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email with timeout and error handling
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: validatedData.recipientEmail,
      subject: `Signed Agreement - ${agreement.client.firstName} ${agreement.client.lastName}`,
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

      console.log('Email sent successfully:', info);

      return NextResponse.json({
        message: 'Agreement sent successfully',
        recipientEmail: validatedData.recipientEmail
      });
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      // Return a more helpful error message
      if (emailError.message && emailError.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Email service is currently unavailable. Please try again later or contact support.' 
        }, { status: 503 });
      } else if (emailError.message && emailError.message.includes('authentication')) {
        return NextResponse.json({ 
          error: 'Email authentication failed. Please contact support to fix email configuration.' 
        }, { status: 503 });
      } else {
        return NextResponse.json({ 
          error: 'Failed to send email. Please try again later or contact support.' 
        }, { status: 500 });
      }
    }

  } catch (error: any) {
    console.error('Error sending email:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to send email' 
    }, { status: 500 });
  }
}
