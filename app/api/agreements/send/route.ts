import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { pickSecondSigner } from '@/lib/agreementSmartFields';
import { escapeHtml } from '@/lib/htmlEscape';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';
import { handleApiError } from '@/lib/handleApiError';
import { renderCtaButton, renderEmailLayout, renderNoticeBlock } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { getEmailGreeting } from '@/lib/email/greeting';
import { logAgreementActivity } from '@/lib/activityLog';
import { formatDateTimeToronto, formatEventDateToronto } from '@/lib/dates';

const sendAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = sendAgreementSchema.parse(body);

    // Find the agreement with client, template, and event data
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      include: {
        client: true,
        template: true,
        event: true
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

    // Use customHtmlContent if available, otherwise fall back to template.htmlContent
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
    const clientGreeting = escapeHtml(getEmailGreeting(agreement.client));
    
    // Get the base URL from the request headers or environment
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const clientLink = `${baseUrl}/agreement/${agreement.uniqueToken}`;

    // Get current send count for different messaging
    const currentSendCount = agreement.emailSendCount || 0;
    const newSendCount = currentSendCount + 1;
    
    // Format expiration date for display
    const expirationDate = agreement.expiresAt
      ? formatEventDateToronto(agreement.expiresAt)
      : 'No expiration date set';
    
    // Different messaging based on send count
    let emailSubject, emailTitle, emailMessage, emailUrgency;
    let noticeLabel: string;
    let noticeTone: 'default' | 'alert' = 'default';
    
    if (newSendCount === 1) {
      emailSubject = `Service Agreement Ready - ${clientFirstName}`;
      emailTitle = "Service Agreement Ready for Review";
      emailMessage = "Your service agreement is ready for review and digital signature. Please click the button below to access your agreement.";
      emailUrgency = `This agreement expires on ${expirationDate}. Please review and sign before the expiration date.`;
      noticeLabel = 'Important:';
    } else if (newSendCount === 2) {
      emailSubject = `Reminder: Service Agreement Pending - ${clientFirstName}`;
      emailTitle = "Reminder: Your Service Agreement is Waiting";
      emailMessage = "This is a friendly reminder that your service agreement is still waiting for your review and signature. We want to make sure everything is ready for your event.";
      emailUrgency = `Please review and sign your agreement to secure your booking. This agreement expires on ${expirationDate}.`;
      noticeLabel = 'Reminder:';
    } else {
      emailSubject = `Final Notice: Service Agreement - ${clientFirstName}`;
      emailTitle = "Final Notice: Service Agreement Signature Required";
      emailMessage = "This is our final notice regarding your service agreement. We need your signature to proceed with your booking and ensure everything is ready for your event.";
      emailUrgency = `Please sign your agreement immediately to avoid any delays in your service. This agreement expires on ${expirationDate}.`;
      noticeLabel = 'Final Notice:';
      noticeTone = 'alert';
    }

    const urgencyContent =
      emailUrgency +
      (newSendCount > 1
        ? `<br><br><strong>Previous emails sent:</strong> ${currentSendCount}`
        : '');

    const bodyHtml = `
      <p style="margin:0 0 16px 0;">Dear ${clientGreeting},</p>
      <p style="margin:0 0 16px 0;">${emailMessage}</p>
      ${renderCtaButton({ label: 'Review & Sign Agreement', url: clientLink, tone: 'default' })}
      ${renderNoticeBlock(noticeLabel, urgencyContent, noticeTone)}
      <h2 style="margin:24px 0 12px 0;font-size:17px;font-weight:600;color:#1A1A18;">Agreement Preview:</h2>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px 0;">
        <tr>
          <td style="padding:16px 18px;background-color:#F2F2EF;border:1px solid #E3E3DE;font-family:'Libre Franklin', Helvetica, Arial, sans-serif;font-size:14px;line-height:1.65;color:#1A1A18;">
            ${processedHtml.substring(0, 500)}${processedHtml.length > 500 ? '...' : ''}
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px 0;">To view the complete agreement and sign it digitally, please click the button above.</p>
      <h2 style="margin:24px 0 12px 0;font-size:17px;font-weight:600;color:#1A1A18;">What happens next?</h2>
      <ul style="margin:0 0 16px 0;padding-left:20px;">
        <li style="margin-bottom:6px;">Review the complete agreement terms and conditions</li>
        <li style="margin-bottom:6px;">Verify all information is correct</li>
        <li style="margin-bottom:6px;">Sign the agreement digitally using your email confirmation</li>
        <li style="margin-bottom:6px;">Download a copy of your signed agreement</li>
      </ul>
      <p style="margin:0 0 16px 0;">If you have any questions about this agreement, please contact us at info@photoboothguys.ca</p>
      <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#5E5E58;text-align:center;">
        This email was sent by Photobooth Guys Agreement Management System<br>
        Agreement ID: ${agreement.id} | Generated: ${formatDateTimeToronto(new Date())}
      </p>
    `;

    const emailHtml = renderEmailLayout({
      title: emailTitle,
      preheader: emailMessage,
      bodyHtml,
      tone: 'default',
    });

    // Send email with timeout and error handling — CC second signer when enabled
    const secondSignerEnabled = Boolean(agreement.secondSignerEnabled);
    const secondSignerEmail = agreement.secondSignerEmail;
    const ccList: string[] = [];
    if (
      secondSignerEnabled &&
      secondSignerEmail &&
      secondSignerEmail.toLowerCase() !== (agreement.client.email || '').toLowerCase()
    ) {
      ccList.push(secondSignerEmail);
    }

    try {
      const info = await sendEmail({
        to: agreement.client.email,
        cc: ccList.length > 0 ? ccList : undefined,
        subject: emailSubject,
        html: emailHtml,
      });

      devLog('Agreement email sent successfully:', info);

      // Update agreement status to LIVE if it was DRAFT and track email send
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: { 
          status: agreement.status === 'DRAFT' ? 'LIVE' : agreement.status,
          lastEmailedAt: new Date(),
          emailSendCount: { increment: 1 }
        }
      });

      await logAgreementActivity(agreement.id, 'SENT', { sendCount: newSendCount });

      return NextResponse.json({
        message: 'Agreement sent successfully',
        recipientEmail: agreement.client.email,
        ccEmails: ccList,
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

  } catch (error) {
    return handleApiError(error, 'agreements/send');
  }
}
