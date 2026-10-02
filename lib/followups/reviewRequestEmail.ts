import { getEmailGreeting } from '@/lib/email/greeting';
import { renderEmailLayout } from '@/lib/email/layout';
import { escapeHtml } from '@/lib/htmlEscape';

export const REVIEW_REQUEST_SUBJECT = 'A quick favour';

/**
 * The one-time review request. The copy is fixed: don't add to it.
 * The layout shows its title as the heading, so the subject doubles as the title.
 */
export function buildReviewRequestEmail(
  client: { firstName: string; emailGreetingName?: string | null },
  reviewUrl: string,
): { subject: string; html: string; text: string } {
  const name = getEmailGreeting(client);
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(reviewUrl);

  const bodyHtml = `
      <p style="margin:0 0 16px 0;">Hi ${safeName},</p>
      <p style="margin:0 0 16px 0;">Hope you've had a chance to go through the photos from your event. If you have a minute, a short Google review would mean a lot to us. It's how most people find us.</p>
      <p style="margin:0 0 16px 0;word-break:break-all;"><a href="${safeUrl}" style="color:#1E3B31;text-decoration:underline;">${safeUrl}</a></p>
      <p style="margin:0 0 16px 0;">Thanks again for having us.</p>
      <p style="margin:0;">Dennis</p>
    `;

  const text = [
    `Hi ${name},`,
    '',
    "Hope you've had a chance to go through the photos from your event. If you have a minute, a short Google review would mean a lot to us. It's how most people find us.",
    '',
    reviewUrl,
    '',
    'Thanks again for having us.',
    'Dennis',
  ].join('\n');

  return {
    subject: REVIEW_REQUEST_SUBJECT,
    html: renderEmailLayout({ title: REVIEW_REQUEST_SUBJECT, bodyHtml, tone: 'default' }),
    text,
  };
}
