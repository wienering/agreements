import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { generateMagicLoginUrl } from '@/lib/magicToken';
import { escapeHtml } from '@/lib/htmlEscape';
import { handleApiError } from '@/lib/handleApiError';

const sendGalleryReadyEmailSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const validatedData = sendGalleryReadyEmailSchema.parse(body);

    // Find the agreement with client and event data
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      include: {
        client: true,
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    // Get gallery links - prefer galleryLinks array, fallback to galleryLink
    const galleryLinksRaw = agreement.galleryLinks as Array<{ title: string; url: string }> | null;
    const galleryLinks = Array.isArray(galleryLinksRaw) && galleryLinksRaw.length > 0
      ? galleryLinksRaw.filter((g: any) => g?.url?.trim())
      : agreement.galleryLink
        ? [{ title: 'Photo Gallery', url: agreement.galleryLink }]
        : [];

    if (galleryLinks.length === 0) {
      return NextResponse.json({ 
        error: 'No gallery link has been set for this agreement. Please add a gallery link first.' 
      }, { status: 400 });
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ 
        error: 'Email service is not configured. Please contact support to set up email functionality.'
      }, { status: 503 });
    }

    // Get the base URL from the request headers or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    
    // Generate magic login link for one-click access
    const portalLink = generateMagicLoginUrl(
      baseUrl,
      agreement.client.id,
      agreement.client.email,
      'gallery_access'
    );

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

    // Get event details for the email
    const eventDate = agreement.event?.eventDate 
      ? new Date(agreement.event.eventDate).toLocaleDateString('en-CA', {
          timeZone: 'America/Toronto',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : null;
    const eventType = escapeHtml(agreement.event?.eventType || 'your event');
    const clientFirstName = escapeHtml(agreement.client.firstName);
    const clientLastName = escapeHtml(agreement.client.lastName);
    const eventDateSafe = eventDate ? escapeHtml(eventDate) : null;
    const galleryLinksHtml = galleryLinks.map((g, i) => {
      const title = escapeHtml((g.title || 'Photo Gallery').trim() || `Gallery ${i + 1}`);
      const url = escapeHtml(g.url);
      return `<li style="margin-bottom: 8px;">
                    <strong>${title}:</strong> 
                    <a href="${url}" style="color: #3d8560;">${url}</a>
                  </li>`;
    }).join('');
    const galleryIntro = galleryLinks.length === 1
      ? `Here is the link for your ${escapeHtml((galleryLinks[0].title || 'photo gallery').trim())}:`
      : 'Here are the links for your galleries:';

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #4a9e72; margin: 0; }
          .content { margin-bottom: 30px; }
          .gallery-ready { 
            background: linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%); 
            border: 1px solid #93c5fd; 
            padding: 25px; 
            border-radius: 12px; 
            margin: 25px 0; 
            text-align: center;
          }
          .gallery-ready h2 {
            color: #1e40af;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .button { 
            display: inline-block; 
            background-color: #4a9e72 !important; 
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
            min-width: 220px;
            letter-spacing: 0.5px;
          }
          .button:hover { 
            background-color: #3d8560; 
          }
          .button-secondary {
            background-color: #3d8560 !important;
          }
          .button-secondary:hover {
            background-color: #1d4ed8;
          }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
          .thank-you { 
            background-color: #ecfdf5; 
            border: 1px solid #6ee7b7; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            text-align: center; 
          }
          .event-details { 
            background-color: #f8fafc; 
            border: 1px solid #e2e8f0; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 20px 0; 
          }
          .instructions {
            background-color: #fffbeb;
            border: 1px solid #fcd34d;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .contact-info { 
            background-color: #f8fafc; 
            border: 1px solid #e2e8f0; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 20px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Photobooth Guys</h1>
            <p>Your Photo Gallery is Ready!</p>
          </div>
          
          <div class="content">
            <div class="thank-you">
              <h2 style="margin: 0 0 10px 0; color: #047857;">🎉 Thank You, ${clientFirstName}!</h2>
              <p style="margin: 0; font-size: 16px;">Thank you for choosing Photobooth Guys for ${eventType}!</p>
            </div>
            
            <p>Dear ${clientFirstName} ${clientLastName},</p>
            
            <p>We hope you had an amazing time at your event! We're excited to let you know that <strong>your photo gallery is now ready</strong> and waiting for you.</p>
            
            <div class="gallery-ready">
              <h2>📸 Your Photos Are Ready!</h2>
              <p style="margin: 0 0 5px 0; color: #4b5563;">All the fantastic photos from your event are now available to view and download.</p>
              ${eventDateSafe ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Event Date: ${eventDateSafe}</p>` : ''}
            </div>
            
            <div class="instructions">
              <h3 style="margin: 0 0 15px 0; color: #92400e;">📋 Your Gallery Links</h3>
              <p style="margin: 0 0 12px 0; color: #78350f;">${galleryIntro}</p>
              <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                ${galleryLinksHtml}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalLink}" class="button">Open Client Portal</a>
            </div>
            
            <p style="text-align: center; font-size: 12px; color: #6b7280;">
              This link is unique to you and will automatically log you in. It expires in 7 days.
            </p>
            
            <div class="event-details">
              <h3 style="margin: 0 0 10px 0;">Your Client Portal Features:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>View and download all your event photos</li>
                <li>Access your signed agreements</li>
                <li>Track payment information</li>
                <li>View event details and preferences</li>
              </ul>
            </div>
            
            <p>We truly appreciate you choosing Photobooth Guys to be part of your special day. It was a pleasure serving you, and we hope the photos bring back wonderful memories!</p>
            
            <div class="contact-info">
              <h3 style="margin: 0 0 10px 0;">Questions or Need Help?</h3>
              <p style="margin: 0;">Our team is here to help!</p>
              <p style="margin: 5px 0;"><strong>📧 Email:</strong> info@photoboothguys.ca</p>
              <p style="margin: 5px 0;"><strong>📞 Phone:</strong> 647-378-5332</p>
              <p style="margin: 5px 0;"><strong>🌐 Website:</strong> <a href="https://photoboothguys.ca" style="color: #4a9e72;">photoboothguys.ca</a></p>
            </div>
            
            <p>Thank you again for choosing us. We look forward to capturing more memories for you in the future!</p>
            
            <p>Best regards,<br>
            <strong>The Photobooth Guys Team</strong></p>
          </div>
          
          <div class="footer">
            <p>Photobooth Guys</p>
            <p>© ${new Date().getFullYear()} Photobooth Guys. All rights reserved.</p>
            <p>Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with timeout and error handling
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: agreement.client.email,
      subject: `Your Photo Gallery is Ready - ${clientFirstName}! 📸`,
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

      devLog('Gallery ready email sent successfully:', info);

      // Update the agreement to track that the gallery email was sent
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: { galleryEmailSentAt: new Date() }
      });

      return NextResponse.json({
        success: true,
        message: 'Gallery ready email sent successfully',
        recipientEmail: agreement.client.email,
        agreementId: agreement.id
      });
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      if (emailError.message && emailError.message.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Email service is currently unavailable. Please try again later.' 
        }, { status: 503 });
      } else if (emailError.message && emailError.message.includes('authentication')) {
        return NextResponse.json({ 
          error: 'Email authentication failed. Please contact support.' 
        }, { status: 503 });
      } else {
        return NextResponse.json({ 
          error: 'Failed to send email. Please try again later.' 
        }, { status: 500 });
      }
    }

  } catch (error) {
    return handleApiError(error, 'agreements/send-gallery-ready-email');
  }
}


