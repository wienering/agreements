import nodemailer from 'nodemailer';
import { devLog } from './logger';

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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const viewAlertTo = process.env.ADMIN_EMAIL || 'info@photoboothguys.ca';

    devLog('[view-alert] SMTP config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      from: process.env.SMTP_FROM,
      to: viewAlertTo,
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

    devLog('[view-alert] Calling transporter.verify()...');
    await transporter.verify();

    devLog('[view-alert] Sending view alert email to:', viewAlertTo);
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: viewAlertTo,
      subject: `📄 Agreement Viewed - ${agreement.client.firstName} ${agreement.client.lastName}`,
      html: emailContent,
    });

    devLog('[view-alert] Email SENT. messageId:', result.messageId);
    return true;
  } catch (error) {
    console.error('[view-alert] FAILED to send view alert email:', error);
    return false;
  }
}
