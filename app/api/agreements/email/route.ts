import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { devLog } from '@/lib/logger';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { escapeHtml } from '@/lib/htmlEscape';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';

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
        template: true,
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Signed agreement not found or has expired' 
      }, { status: 404 });
    }

    const recipientEmail = validatedData.recipientEmail.toLowerCase();
    const primaryEmail = agreement.client.email.toLowerCase();
    const matchesPrimary = primaryEmail === recipientEmail;
    const matchesSecondSigner =
      agreement.secondSignerEnabled &&
      !!agreement.secondSignerEmail &&
      agreement.secondSignerEmail.toLowerCase() === recipientEmail;

    if (!matchesPrimary && !matchesSecondSigner) {
      return NextResponse.json(
        { error: 'Recipient email does not match agreement signers' },
        { status: 403 }
      );
    }

    const htmlToProcess = agreement.customHtmlContent || agreement.template.htmlContent;
    const processedHtml = processHtmlContent(
      htmlToProcess,
      agreement.client,
      agreement.id,
      agreement.event,
      pickSecondSigner(agreement),
    );
    const clientFirstName = escapeHtml(agreement.client.firstName);
    const clientLastName = escapeHtml(agreement.client.lastName);
    const clientEmail = escapeHtml(agreement.client.email);

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
          <title>Signed Agreement - ${clientFirstName} ${clientLastName}</title>
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
              background: #3d8560;
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
              border-left: 4px solid #4a9e72;
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
              background: #3d8560 !important;
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
              <p>Your Signed Service Agreement</p>
            </div>
            
            <div class="content">
              <h2>Hello ${clientFirstName},</h2>
              <p>Please find a copy of your previously signed service agreement below. This agreement is already legally binding and does not require any further action from you.</p>
              
              <div class="signature-info">
                <h3>Agreement Details</h3>
                <p><strong>Client:</strong> ${clientFirstName} ${clientLastName}</p>
                <p><strong>Email:</strong> ${clientEmail}</p>
                <p><strong>Date Signed:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Agreement ID:</strong> ${agreement.id}</p>
                <p><strong>Status:</strong> <span style="color: #4a9e72; font-weight: bold;">✓ Already Signed</span></p>
              </div>
              
              <div class="agreement-content">
                ${processedHtml}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/agreement/${validatedData.token}" class="button" style="color: white !important; background-color: #3d8560 !important;">View Online</a>
                <a href="${baseUrl}/agreement/${validatedData.token}#download" class="button" style="color: white !important; background-color: #3d8560 !important;">Download PDF</a>
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
      subject: `Copy of Your Signed Agreement - ${clientFirstName} ${clientLastName}`,
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

      devLog('Email sent successfully:', info);

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
