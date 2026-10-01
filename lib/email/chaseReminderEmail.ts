import { escapeHtml } from '@/lib/htmlEscape';
import {
  formatEventDateForEmail,
  getEventDate,
  type ChaseAgreement,
  type ResolvedReminderRecipient,
} from '@/lib/chaseUnsignedAgreement';
import { renderCtaButton, renderEmailLayout } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { formatDateTimeToronto } from '@/lib/dates';

type SendChaseReminderEmailArgs = {
  agreement: ChaseAgreement;
  reminderNumber: 1 | 2;
  recipient: ResolvedReminderRecipient;
  baseUrl: string;
};

export async function sendChaseReminderEmail({
  agreement,
  reminderNumber,
  recipient,
  baseUrl,
}: SendChaseReminderEmailArgs): Promise<void> {
  const agreementUrl = `${baseUrl}/agreement/${agreement.uniqueToken}`;
  const greetingName = escapeHtml(recipient.greetingFirstName);
  const eventDate = getEventDate(agreement);
  const formattedEventDate = eventDate ? escapeHtml(formatEventDateForEmail(eventDate)) : null;

  const subject =
    reminderNumber === 1
      ? 'A friendly reminder: your agreement is waiting'
      : 'Quick reminder ahead of your event';

  const bodyMessage =
    reminderNumber === 1
      ? 'Just a quick note that your service agreement is still waiting for your review and signature. When you have a moment, you can open it using the button below.'
      : formattedEventDate
        ? `We wanted to reach out once more before your event on ${formattedEventDate}. Please take a moment to review and sign your agreement so we can confirm everything is ready for you.`
        : 'We wanted to reach out once more before your upcoming event. Please take a moment to review and sign your agreement so we can confirm everything is ready for you.';

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hi ${greetingName},</p>
    <p style="margin:0 0 16px 0;">${bodyMessage}</p>
    ${renderCtaButton({ label: 'Review & Sign Agreement', url: agreementUrl, tone: 'default' })}
    <p style="margin:16px 0 0 0;">If you have any questions, just reply to this email or contact us at info@photoboothguys.ca.</p>
    <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#5E5E58;text-align:center;">
      Photobooth Guys Agreement Management System<br>
      Agreement ID: ${escapeHtml(agreement.id)} | Generated: ${formatDateTimeToronto(new Date())}
    </p>
  `;

  const emailHtml = renderEmailLayout({
    title: reminderNumber === 1 ? 'Agreement reminder' : 'Reminder ahead of your event',
    preheader: bodyMessage,
    bodyHtml,
    tone: 'default',
  });

  await sendEmail({
    to: recipient.to,
    cc: recipient.cc?.length ? recipient.cc : undefined,
    subject,
    html: emailHtml,
  });
}
