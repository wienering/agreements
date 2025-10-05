import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

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

// Helper function to create email transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Helper function to send view alert email
async function sendViewAlertEmail(agreement: any, clientIP: string, userAgent: string) {
  try {
    console.log('📧 Creating email transporter...');
    const transporter = createTransporter();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    console.log('📧 SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM,
      adminEmail: process.env.ADMIN_EMAIL
    });
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📄 Agreement Viewed</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Someone has viewed an agreement</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Agreement Details</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p><strong>Agreement ID:</strong> ${agreement.id}</p>
            <p><strong>Client:</strong> ${agreement.client.firstName} ${agreement.client.lastName}</p>
            <p><strong>Client Email:</strong> ${agreement.client.email}</p>
            <p><strong>Template:</strong> ${agreement.template.title}</p>
            <p><strong>Status:</strong> ${agreement.status}</p>
            <p><strong>View Count:</strong> ${agreement.viewCount}</p>
            <p><strong>First Viewed:</strong> ${agreement.firstViewedAt ? new Date(agreement.firstViewedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'Just now'}</p>
            <p><strong>Last Viewed:</strong> ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #333; margin-top: 0;">View Details</h3>
            <p><strong>IP Address:</strong> ${clientIP}</p>
            <p><strong>User Agent:</strong> ${userAgent}</p>
            <p><strong>Viewed At:</strong> ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}/admin/agreements" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View in Admin Panel
            </a>
          </div>
        </div>
      </div>
    `;

    console.log('📧 Sending email to:', process.env.ADMIN_EMAIL || 'agreements@photoboothguys.ca');
    console.log('📧 Email subject:', `📄 Agreement Viewed - ${agreement.client.firstName} ${agreement.client.lastName}`);
    
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@photoboothguys.ca',
      to: process.env.ADMIN_EMAIL || 'agreements@photoboothguys.ca',
      subject: `📄 Agreement Viewed - ${agreement.client.firstName} ${agreement.client.lastName}`,
      html: emailContent,
    });
    
    console.log('📧 Email sent successfully:', result.messageId);
  } catch (error) {
    console.error('❌ Error sending view alert email:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    console.log('🔍 Track view API called with token:', token);
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Get client IP and user agent
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Find the agreement
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: token,
        OR: [
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
    
    console.log('📊 Agreement found:', {
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
    if (isFirstView) {
      console.log('📧 Sending view alert email for first view...');
      await sendViewAlertEmail(agreement, clientIP, userAgent);
      console.log('✅ View alert email sent successfully');
    } else {
      console.log('📧 Skipping email alert - not first view');
    }

    return NextResponse.json({ 
      success: true, 
      viewCount: agreement.viewCount + 1,
      isFirstView 
    });

  } catch (error) {
    console.error('Error tracking agreement view:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
