import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { sendViewAlertEmail } from '@/lib/view-alert-email';
import { handleApiError } from '@/lib/handleApiError';

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

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    devLog('🔍 Track view API called with token:', token);
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Check if SMTP is configured (same check as working email system)
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[track-view] SMTP not configured - skipping view alert email. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
      devLog('⚠️ SMTP not configured, skipping email alert');
      return NextResponse.json({ 
        success: true, 
        viewCount: 1,
        isFirstView: true,
        emailSkipped: 'SMTP not configured'
      });
    }

    // Get client IP and user agent
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Find the agreement
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: token,
        OR: [
          { status: 'SIGNED' }, // Signed agreements bypass expiration
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      include: {
        client: true,
        template: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found or expired' }, { status: 404 });
    }

    // Check if this is the first view
    const isFirstView = !agreement.firstViewedAt;
    
    devLog('📊 Agreement found:', {
      id: agreement.id,
      client: `${agreement.client.firstName} ${agreement.client.lastName}`,
      isFirstView,
      currentViewCount: agreement.viewCount
    });
    
    // Update view tracking
    await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        firstViewedAt: agreement.firstViewedAt || new Date(),
        lastViewedAt: new Date(),
        viewCount: agreement.viewCount + 1
      }
    });

    // Send email alert (only for first view to avoid spam)
    let emailSent = false;
    if (isFirstView) {
      devLog('📧 Sending view alert email for first view...');
      emailSent = await sendViewAlertEmail(agreement, clientIP, userAgent);
      devLog(emailSent ? '✅ View alert email sent successfully' : '⚠️ View alert email failed to send');
    } else {
      devLog('📧 Skipping email alert - not first view');
    }

    return NextResponse.json({ 
      success: true, 
      viewCount: agreement.viewCount + 1,
      isFirstView,
      emailSent: isFirstView ? emailSent : undefined
    });

  } catch (error) {
    return handleApiError(error, 'agreements/track-view', request.method);
  }
}
