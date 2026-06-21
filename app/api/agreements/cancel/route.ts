import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { escapeHtml } from '@/lib/htmlEscape';
import { handleApiError } from '@/lib/handleApiError';
import { renderEmailLayout, renderNoticeBlock } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { getEmailGreeting } from '@/lib/email/greeting';
import { logAgreementActivity } from '@/lib/activityLog';

const cancelAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  cancellationReason: z.string().min(1, 'Cancellation reason is required'),
  adminName: z.string().min(1, 'Admin name is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = cancelAgreementSchema.parse(body);

    // Find the agreement
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      include: {
        client: true,
        template: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    // Only allow cancellation of SIGNED agreements
    if (agreement.status !== 'SIGNED') {
      return NextResponse.json({ 
        error: 'Only signed agreements can be cancelled' 
      }, { status: 400 });
    }

    // Update agreement status to CANCELLED
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: validatedData.adminName,
        cancellationReason: validatedData.cancellationReason,
        archived: true,
        archivedAt: new Date()
      },
      include: {
        client: true,
        template: true
      }
    });

    // Send cancellation email to client
    try {
      await sendCancellationEmail(updatedAgreement, validatedData.cancellationReason, validatedData.adminName, request);
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the cancellation process if email fails
    }

    await logAgreementActivity(agreement.id, 'CANCELLED');

    return NextResponse.json({
      message: 'Agreement cancelled and archived successfully',
      agreement: updatedAgreement
    });
  } catch (error) {
    return handleApiError(error, 'agreements/cancel');
  }
}

// Function to send cancellation email to client
async function sendCancellationEmail(agreement: any, reason: string, adminName: string, request: NextRequest) {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    devLog('SMTP not configured, skipping cancellation email');
    return;
  }

  // Create email content
  const clientFirstName = escapeHtml(agreement.client.firstName);
  const clientLastName = escapeHtml(agreement.client.lastName);
  const clientGreeting = escapeHtml(getEmailGreeting(agreement.client));
  const clientEmail = escapeHtml(agreement.client.email);
  const templateTitle = escapeHtml(agreement.template.title);
  const safeAdminName = escapeHtml(adminName);
  const safeReason = escapeHtml(reason);

  const agreementDetailsHtml = `
    <strong>Client:</strong> ${clientFirstName} ${clientLastName}<br>
    <strong>Email:</strong> ${clientEmail}<br>
    <strong>Template:</strong> ${templateTitle}<br>
    <strong>Agreement ID:</strong> ${agreement.id}<br>
    <strong>Originally Signed:</strong> ${agreement.signedAt ? new Date(agreement.signedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}<br>
    <strong>Cancelled On:</strong> ${agreement.cancelledAt ? new Date(agreement.cancelledAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'N/A'}<br>
    <strong>Cancelled By:</strong> ${safeAdminName}<br>
    <strong>Reason:</strong> ${safeReason}`;

  const importantInfoHtml = `
    <ul style="margin:0;padding-left:20px;">
      <li>This agreement is now null and void</li>
      <li>All terms and conditions are no longer in effect</li>
      <li>Any services scheduled under this agreement are cancelled</li>
      <li>If you have any questions, please contact us immediately</li>
    </ul>`;

  const bodyHtml = `
    ${renderNoticeBlock('Agreement Cancelled', '<strong>Your service agreement has been cancelled by Photobooth Guys.</strong>', 'alert')}
    <p style="margin:0 0 16px 0;">Dear ${clientGreeting},</p>
    <p style="margin:0 0 16px 0;">We are writing to inform you that your service agreement has been cancelled. This action was taken by our administration team and is effective immediately.</p>
    ${renderNoticeBlock('Agreement Details', agreementDetailsHtml, 'alert')}
    ${renderNoticeBlock('Important Information', importantInfoHtml, 'alert')}
    <p style="margin:0 0 16px 0;">If you believe this cancellation was made in error, or if you have any questions about this matter, please contact us immediately at <strong>info@photoboothguys.ca</strong>.</p>
    <p style="margin:0 0 16px 0;">We apologize for any inconvenience this may cause.</p>
    <p style="margin:0 0 16px 0;">Best regards,<br><strong>Photobooth Guys Administration</strong></p>
    <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6E655A;text-align:center;">
      Photobooth Guys Agreement Management System<br>
      Generated: ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}
    </p>
  `;

  const emailHtml = renderEmailLayout({
    title: 'Agreement Cancellation Notice',
    preheader: 'Your service agreement has been cancelled.',
    bodyHtml,
    tone: 'alert',
  });

  try {
    await sendEmail({
      to: agreement.client.email,
      subject: `Agreement Cancelled - ${clientFirstName} ${clientLastName} - ${templateTitle}`,
      html: emailHtml,
    });
    devLog('Cancellation email sent successfully');
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Failed to send cancellation email:', error);
    throw error;
  }
}
