import { escapeHtml } from '@/lib/htmlEscape';
import { devLog } from './logger';
import { renderCtaButton, renderEmailLayout, renderNoticeBlock } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';

/**
 * Send "Agreement Viewed" alert email. Returns true if sent, false if failed or SMTP not configured.
 */
export async function sendViewAlertEmail(
  agreement: { id: string; status: string; viewCount: number; firstViewedAt: Date | null; client: { firstName: string; lastName: string; email: string }; template: { title: string } },
  clientIP: string,
  userAgent: string
): Promise<boolean> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    devLog('[view-alert] SMTP not configured - skipping view alert email');
    return false;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const viewAlertTo = process.env.ADMIN_EMAIL || 'info@photoboothguys.ca';
    const adminUrl = `${baseUrl}/admin/agreements`;

    devLog('[view-alert] SMTP config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      from: process.env.SMTP_FROM,
      to: viewAlertTo,
    });

    const clientFirstName = escapeHtml(agreement.client.firstName);
    const clientLastName = escapeHtml(agreement.client.lastName);
    const clientEmail = escapeHtml(agreement.client.email);
    const templateTitle = escapeHtml(agreement.template.title);
    const agreementStatus = escapeHtml(agreement.status);
    const safeClientIP = escapeHtml(clientIP);
    const safeUserAgent = escapeHtml(userAgent);

    const agreementDetailsHtml = `
      <strong>Agreement ID:</strong> ${agreement.id}<br>
      <strong>Client:</strong> ${clientFirstName} ${clientLastName}<br>
      <strong>Client Email:</strong> ${clientEmail}<br>
      <strong>Template:</strong> ${templateTitle}<br>
      <strong>Status:</strong> ${agreementStatus}<br>
      <strong>View Count:</strong> ${agreement.viewCount}<br>
      <strong>First Viewed:</strong> ${agreement.firstViewedAt ? new Date(agreement.firstViewedAt).toLocaleString('en-CA', { timeZone: 'America/Toronto' }) : 'Just now'}<br>
      <strong>Last Viewed:</strong> ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}`;

    const viewDetailsHtml = `
      <strong>IP Address:</strong> ${safeClientIP}<br>
      <strong>User Agent:</strong> ${safeUserAgent}<br>
      <strong>Viewed At:</strong> ${new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })}`;

    const bodyHtml = `
      <p style="margin:0 0 16px 0;">Someone has viewed an agreement.</p>
      ${renderCtaButton({ label: 'Open Admin Panel', url: adminUrl, tone: 'default' })}
      ${renderNoticeBlock('Agreement Details', agreementDetailsHtml, 'default')}
      ${renderNoticeBlock('View Details', viewDetailsHtml, 'default')}
    `;

    const emailHtml = renderEmailLayout({
      title: 'Agreement Viewed',
      preheader: 'Someone has viewed an agreement.',
      bodyHtml,
      tone: 'default',
    });

    devLog('[view-alert] Sending view alert email to:', viewAlertTo);
    const result = await sendEmail({
      to: viewAlertTo,
      subject: `Agreement Viewed - ${clientFirstName} ${clientLastName}`,
      html: emailHtml,
    });

    devLog('[view-alert] Email SENT. messageId:', result.messageId);
    return true;
  } catch (error) {
    console.error('[view-alert] FAILED to send view alert email:', error);
    return false;
  }
}
