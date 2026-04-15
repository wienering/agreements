import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const sendReviewRequestSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

// Google review link provided by Dennis
const GOOGLE_REVIEW_URL = 'https://share.google/cQ0sGZEBM1rhWvlux';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = sendReviewRequestSchema.parse(body);

    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      include: { client: true },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    if (agreement.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Review request emails can only be sent for completed agreements' },
        { status: 400 }
      );
    }

    if (!agreement.client?.email) {
      return NextResponse.json({ error: 'Client email is missing' }, { status: 400 });
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        {
          error: 'Email service is not configured. Please contact support to set up email functionality.',
          fallback: {
            reviewLink: GOOGLE_REVIEW_URL,
            message: 'You can copy and share this review link with your client instead.',
          },
        },
        { status: 503 }
      );
    }

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

    const clientName = `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim();
    const subject = `Quick favor: could you leave us a Google review?`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Google Review Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #111827; background: #f3f4f6; }
            .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
            .header { background: #22c55e; color: white; padding: 28px; text-align: center; }
            .content { padding: 28px; }
            .button-wrap { text-align: center; margin: 28px 0; }
            .button {
              display: inline-block;
              background: #16a34a !important;
              color: #ffffff !important;
              padding: 14px 22px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 700;
              font-size: 16px;
            }
            .muted { color: #6b7280; font-size: 12px; }
            .footer { padding: 16px 28px 24px; background: #f9fafb; }
            .link { word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;font-size:20px;">Photobooth Guys</h1>
              <p style="margin:8px 0 0 0;opacity:0.9;">Thanks again for choosing us</p>
            </div>
            <div class="content">
              <p>Hello${clientName ? ` ${clientName}` : ''},</p>
              <p>We hope you loved your experience. If you have 30 seconds, would you mind leaving us a quick Google review? It really helps our small business.</p>

              <div class="button-wrap">
                <a class="button" href="${GOOGLE_REVIEW_URL}">Write a Google Review</a>
              </div>

              <p class="muted">If the button doesn’t work, copy and paste this link:</p>
              <p class="link"><a href="${GOOGLE_REVIEW_URL}">${GOOGLE_REVIEW_URL}</a></p>
            </div>
            <div class="footer">
              <p class="muted" style="margin:0;">Agreement ID: ${agreement.id}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: agreement.client.email,
      subject,
      html: emailHtml,
    };

    try {
      await transporter.verify();

      await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 15000)),
      ]);

      return NextResponse.json({
        message: 'Review request email sent successfully',
        recipientEmail: agreement.client.email,
      });
    } catch (emailError: any) {
      console.error('Review request email sending failed:', emailError);
      const msg =
        emailError?.message?.includes('timeout')
          ? 'Email service is currently unavailable. Please try again later.'
          : 'Failed to send email. Please try again later.';
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  } catch (error: any) {
    // Zod validation errors
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors?.[0]?.message || 'Invalid request' }, { status: 400 });
    }

    console.error('Error sending review request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




