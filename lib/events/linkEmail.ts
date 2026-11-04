import { escapeHtml } from '@/lib/htmlEscape';
import { getEmailGreeting } from '@/lib/email/greeting';
import { renderCtaButton, renderEmailLayout } from '@/lib/email/layout';
import { formatEventDateToronto } from '@/lib/dates';

export type LinkKind = 'payment' | 'receipt';

/** The email that hands a client their payment or receipt link, in the house email layout. */
export function buildLinkEmail(input: {
  kind: LinkKind;
  url: string;
  client: { firstName: string; emailGreetingName?: string | null };
  eventDate: Date | string | null;
}): { subject: string; html: string; text: string } {
  const greeting = getEmailGreeting(input.client);
  const when = input.eventDate ? ` on ${formatEventDateToronto(input.eventDate)}` : '';
  const isPayment = input.kind === 'payment';
  const subject = isPayment ? `Your payment link - Photobooth Guys` : `Your receipt - Photobooth Guys`;
  const intro = isPayment
    ? `Here is the payment link for your photo booth${when}.`
    : `Here is the receipt for your photo booth${when}.`;
  const after = isPayment ? 'You can also e-transfer to info@photoboothguys.ca.' : 'Thank you for your payment.';

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">Hi ${escapeHtml(greeting)},</p>
    <p style="margin:0 0 16px 0;">${escapeHtml(intro)}</p>
    ${renderCtaButton({ label: isPayment ? 'Make a payment' : 'View receipt', url: input.url, tone: 'default' })}
    <p style="margin:0 0 16px 0;">${escapeHtml(after)}</p>
    <p style="margin:0;">Thank you,<br>Dennis<br>Photobooth Guys<br>647-378-5332</p>
  `;
  const text = [`Hi ${greeting},`, '', intro, input.url, '', after, '', 'Thank you,', 'Dennis', 'Photobooth Guys', '647-378-5332'].join('\n');
  return {
    subject,
    html: renderEmailLayout({ title: isPayment ? 'Your payment link' : 'Your receipt', preheader: intro, bodyHtml }),
    text,
  };
}
