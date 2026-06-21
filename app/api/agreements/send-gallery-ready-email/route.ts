import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { escapeHtml } from '@/lib/htmlEscape';
import { handleApiError } from '@/lib/handleApiError';
import {
  renderCtaButton,
  renderEmailLayout,
  renderNoticeBlock,
} from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';

const sendGalleryReadyEmailSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
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
    const eventType = escapeHtml(agreement.event?.eventType || 'event');
    const clientFirstName = escapeHtml(agreement.client.firstName);
    const eventDateSafe = eventDate ? escapeHtml(eventDate) : null;
    const galleryLinksHtml = galleryLinks.map((g, i) => {
      const title = escapeHtml((g.title || 'Photo Gallery').trim() || `Gallery ${i + 1}`);
      const url = escapeHtml(g.url);
      return `<li style="margin-bottom:8px;"><strong>${title}:</strong> <a href="${url}" style="color:#C0552F;text-decoration:underline;">${url}</a></li>`;
    }).join('');
    const galleryIntro = galleryLinks.length === 1
      ? `Here is the link for your ${escapeHtml((galleryLinks[0].title || 'photo gallery').trim())}:`
      : 'Here are the links for your galleries:';

    const preheader = `Your photo gallery is now ready. View and download your event photos whenever you like.`;

    const galleryLinksPanel = `
      ${galleryIntro}<br>
      <ul style="margin:8px 0 0 0;padding-left:20px;">${galleryLinksHtml}</ul>
      ${eventDateSafe ? `<p style="margin:12px 0 0 0;">Event Date: ${eventDateSafe}</p>` : ''}`;

    const reviewPanel = `
      <p style="margin:0 0 16px 0;">We loved being part of your event. If you have a moment, a Google review would mean a lot to us. It helps other people find us and makes a real difference for a small business like ours.</p>
      <p style="margin:0;"><a href="https://g.page/r/CXHuVoPHi-cIEAI/review" style="color:#C0552F;text-decoration:underline;">Leave a Google Review</a></p>`;

    const bodyHtml = `
      <p style="margin:0 0 16px 0;">Hi ${clientFirstName},</p>
      <p style="margin:0 0 16px 0;">Thank you for choosing Photobooth Guys for your ${eventType}. We hope you had a wonderful time. Your photo gallery is now ready, and you can view and download all of your event photos whenever you like.</p>
      ${renderCtaButton({ label: 'View Your Gallery', url: galleryLinks[0].url, tone: 'default' })}
      ${renderNoticeBlock('Leave Us a Review', reviewPanel, 'default')}
      ${renderNoticeBlock('Your Gallery Links', galleryLinksPanel, 'default')}
      <p style="margin:16px 0 0 0;">We truly appreciate you choosing Photobooth Guys to be part of your special day. It was a pleasure serving you, and we hope the photos bring back wonderful memories!</p>
      ${renderNoticeBlock('Questions or Need Help?', `
        Our team is here to help!<br>
        <strong>Email:</strong> info@photoboothguys.ca<br>
        <strong>Phone:</strong> 647-378-5332<br>
        <strong>Website:</strong> <a href="https://photoboothguys.ca" style="color:#C0552F;text-decoration:underline;">photoboothguys.ca</a>
      `, 'default')}
      <p style="margin:16px 0 0 0;">Thank you again for choosing us. We look forward to capturing more memories for you in the future!</p>
      <p style="margin:16px 0 0 0;">Best regards,<br><strong>The Photobooth Guys Team</strong></p>
      <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6E655A;text-align:center;">
        Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}
      </p>
    `;

    const emailHtml = renderEmailLayout({
      title: 'Your Photo Gallery is Ready',
      preheader,
      bodyHtml,
      tone: 'default',
    });

    try {
      const info = await sendEmail({
        to: agreement.client.email,
        subject: `Your Photo Gallery is Ready - ${clientFirstName}!`,
        html: emailHtml,
      });

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
