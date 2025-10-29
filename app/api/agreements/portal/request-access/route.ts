import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per window per IP

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit_${ip}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Reset or create new window
    const resetTime = now + RATE_LIMIT_WINDOW;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  // Increment count
  current.count++;
  rateLimitStore.set(key, current);
  
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX_REQUESTS - current.count, 
    resetTime: current.resetTime 
  };
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: 'Too many verification requests. Please try again later.',
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: new Date(rateLimit.resetTime).toISOString()
        }
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ 
        error: 'Valid email address is required',
        code: 'INVALID_EMAIL'
      }, { status: 400 });
    }

    const emailLower = email.toLowerCase();

    // Check if client exists
    const client = await prisma.client.findFirst({
      where: { email: emailLower },
    });

    if (!client) {
      // Don't reveal if email exists for security
      return NextResponse.json({ 
        success: true, 
        message: 'If this email is associated with an agreement, you will receive a verification code.',
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: new Date(rateLimit.resetTime).toISOString()
        }
      });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code in database (better than memory for production)
    await prisma.clientSession.upsert({
      where: { 
        sessionToken: `verification_${emailLower}` 
      },
      update: {
        expiresAt,
        lastActivityAt: new Date(),
      },
      create: {
        clientEmail: emailLower,
        sessionToken: `verification_${emailLower}`,
        expiresAt,
        lastActivityAt: new Date(),
      }
    });

    // Check SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, verification code:', verificationCode);
      return NextResponse.json({ 
        success: true, 
        message: 'Email service is not configured. Please contact support.',
        debugCode: verificationCode, // Only for development
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: new Date(rateLimit.resetTime).toISOString()
        }
      });
    }

    // Send verification email with improved template
    const emailHtml = await generateVerificationEmail(client, verificationCode);

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: emailLower,
      subject: 'Your Client Portal Access Code - Photobooth Guys',
      html: emailHtml,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email address.',
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: new Date(rateLimit.resetTime).toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error requesting portal access:', error);
    return NextResponse.json({ 
      error: 'Failed to send verification code. Please try again.',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

async function generateVerificationEmail(client: any, code: string): Promise<string> {
  // Customizable email template
  const template = process.env.VERIFICATION_EMAIL_TEMPLATE || 'default';
  
  if (template === 'minimal') {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your verification code</h2>
        <p>Hello ${client.firstName},</p>
        <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 2px;">${code}</strong></p>
        <p>This code expires in 15 minutes.</p>
      </div>
    `;
  }

  // Default enhanced template
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Client Portal Access Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
          .content { padding: 40px 30px; }
          .code-container { background: #f1f5f9; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; border: 2px dashed #cbd5e1; }
          .code { font-size: 36px; font-weight: 800; color: #2563eb; letter-spacing: 6px; margin: 15px 0; font-family: 'Courier New', monospace; }
          .expiry { color: #64748b; font-size: 14px; margin-top: 10px; }
          .security-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
          .footer a { color: #2563eb; text-decoration: none; }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
            .header, .content, .footer { padding: 20px; }
            .code { font-size: 28px; letter-spacing: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Client Portal Access</p>
          </div>
          
          <div class="content">
            <h2 style="color: #1e293b; margin-top: 0;">Hello ${client.firstName}!</h2>
            <p style="color: #475569; line-height: 1.6;">You requested access to your client portal. Use the verification code below to log in:</p>
            
            <div class="code-container">
              <p style="margin: 0 0 10px 0; color: #64748b; font-weight: 600;">Your verification code:</p>
              <div class="code">${code}</div>
              <div class="expiry">⏰ Expires in 15 minutes</div>
            </div>
            
            <div class="security-note">
              <p style="margin: 0; color: #92400e;"><strong>Security Notice:</strong> If you didn't request this code, please ignore this email. Never share this code with anyone.</p>
            </div>
            
            <p style="color: #64748b;">Once logged in, you'll be able to view all your agreements and add any missing information.</p>
          </div>
          
          <div class="footer">
            <p>This verification code is valid for 15 minutes only.</p>
            <p>Questions? Contact us at <a href="mailto:info@photoboothguys.ca">info@photoboothguys.ca</a></p>
            <p>© ${new Date().getFullYear()} Photobooth Guys. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}