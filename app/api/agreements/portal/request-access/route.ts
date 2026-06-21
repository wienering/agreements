import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { getClientIP } from '@/lib/client-ip';
import { escapeHtml } from '@/lib/htmlEscape';
import { verificationCodeStore } from '../shared/verification-codes';
import {
  renderCodePanel,
  renderEmailLayout,
  renderNoticeBlock,
} from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { getEmailGreeting } from '@/lib/email/greeting';

const RATE_LIMIT_MESSAGE = 'Too many attempts. Please try again in a few minutes.';
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_REQUEST_LIMIT = 3;
const IP_REQUEST_LIMIT = 10;
const LOG_RETENTION_MS = 24 * 60 * 60 * 1000;

function cleanupOldRequestLogs() {
  const cutoff = new Date(Date.now() - LOG_RETENTION_MS);
  prisma.otpRequestLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  }).catch((err) => {
    console.error('Failed to clean up OtpRequestLog rows:', err);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({
        error: 'Valid email address is required',
        code: 'INVALID_EMAIL'
      }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const clientIP = getClientIP(request);
    const windowStart = new Date(Date.now() - REQUEST_WINDOW_MS);

    const [emailCount, ipCount] = await Promise.all([
      prisma.otpRequestLog.count({
        where: { email: emailLower, createdAt: { gte: windowStart } },
      }),
      prisma.otpRequestLog.count({
        where: { ip: clientIP, createdAt: { gte: windowStart } },
      }),
    ]);

    if (emailCount >= EMAIL_REQUEST_LIMIT || ipCount >= IP_REQUEST_LIMIT) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    await prisma.otpRequestLog.create({
      data: { email: emailLower, ip: clientIP },
    });

    cleanupOldRequestLogs();

    // Check if client exists by primary email...
    let client = await prisma.client.findFirst({
      where: { email: emailLower },
    });

    // ...or by secondary signer email on any agreement
    if (!client) {
      const agreementWithSecondary = await prisma.agreement.findFirst({
        where: {
          secondSignerEnabled: true,
          secondSignerEmail: emailLower,
        },
        include: { client: true },
      });
      if (agreementWithSecondary?.client) {
        client = agreementWithSecondary.client;
      }
    }

    if (!client) {
      // Don't reveal if email exists for security
      return NextResponse.json({
        success: true,
        message: 'If this email is associated with an agreement, you will receive a verification code.',
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code; resets failedAttempts but preserves lockedUntil
    await verificationCodeStore.set(emailLower, verificationCode, expiresAt);

    // Check SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      devLog('SMTP not configured, verification code:', verificationCode);
      return NextResponse.json({
        success: true,
        message: 'Email service is not configured. Please contact support.',
        ...(process.env.NODE_ENV === 'development' && { debugCode: verificationCode }),
      });
    }

    const emailHtml = generateVerificationEmail(client, verificationCode);

    await sendEmail({
      to: emailLower,
      subject: 'Your Client Portal Access Code - Photobooth Guys',
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email address.',
    });

  } catch (error: any) {
    console.error('Error requesting portal access:', error);
    return NextResponse.json({
      error: 'Failed to send verification code. Please try again.',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

function generateVerificationEmail(client: any, code: string): string {
  const clientGreeting = escapeHtml(getEmailGreeting(client));
  const template = process.env.VERIFICATION_EMAIL_TEMPLATE || 'default';

  if (template === 'minimal') {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your verification code</h2>
        <p>Hello ${clientGreeting},</p>
        <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 2px;">${code}</strong></p>
        <p>This code expires in 15 minutes.</p>
      </div>
    `;
  }

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hello ${clientGreeting}!</p>
    <p style="margin:0 0 16px 0;">You requested access to your client portal. Use the verification code below to log in:</p>
    ${renderCodePanel(code)}
    ${renderNoticeBlock(
      'Security Notice',
      "<strong>Security Notice:</strong> If you didn't request this code, please ignore this email. Never share this code with anyone.",
      'default',
    )}
    <p style="margin:16px 0 0 0;">Once logged in, you'll be able to view all your agreements and add any missing information.</p>
    <p style="margin:16px 0 0 0;">This verification code is valid for 15 minutes only.</p>
    <p style="margin:8px 0 0 0;">Questions? Contact us at <a href="mailto:info@photoboothguys.ca" style="color:#C0552F;text-decoration:underline;">info@photoboothguys.ca</a></p>
  `;

  return renderEmailLayout({
    title: 'Client Portal Access',
    preheader: 'Your client portal verification code.',
    bodyHtml,
    tone: 'default',
  });
}
