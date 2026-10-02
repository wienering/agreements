import { addTorontoCalendarDaysFrom, formatEventDateToronto } from '@/lib/dates';
import { renderEmailLayout } from '@/lib/email/layout';
import { escapeHtml } from '@/lib/htmlEscape';

export type BalanceReminderDraftInput = {
  firstName?: string | null;
  eventDate?: Date | string | null;
  stripePaymentLink?: string | null;
};

function eventDateOf(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Default client reminder. Any sentence that needs a missing name, date, or
 * payment link is left out. The e-transfer line and the sign-off stay.
 */
export function buildBalanceReminderDraft(input: BalanceReminderDraftInput): {
  subject: string;
  message: string;
} {
  const firstName = input.firstName?.trim() || '';
  const eventDate = eventDateOf(input.eventDate);
  const paymentLink = input.stripePaymentLink?.trim() || '';

  const subject = eventDate
    ? `Balance reminder for your photo booth on ${formatEventDateToronto(eventDate)}`
    : 'Balance reminder for your photo booth';

  const lines: string[] = [];
  if (firstName) {
    lines.push(`Hi ${firstName},`, '');
  }

  const sentences: string[] = [];
  if (eventDate) {
    const due = addTorontoCalendarDaysFrom(eventDate, -7);
    sentences.push(
      `Just a reminder that the balance for your photo booth on ${formatEventDateToronto(eventDate)} is due by ${formatEventDateToronto(due)}.`,
    );
  }
  if (paymentLink) {
    sentences.push(`You can pay here: ${paymentLink}.`);
  }
  sentences.push('You can also e-transfer to info@photoboothguys.ca.');

  lines.push(sentences.join(' '), '');
  lines.push("If you've already sent it, thank you, and please ignore this email.", '');
  lines.push('Dennis', 'Photobooth Guys', '647-378-5332');

  return { subject, message: lines.join('\n') };
}

export function renderBalanceReminderEmail(subject: string, message: string): string {
  const bodyHtml = message
    .split(/\n{2,}/)
    .map((block) => {
      const html = escapeHtml(block).replace(/\n/g, '<br>');
      return `<p style="margin:0 0 16px 0;">${html}</p>`;
    })
    .join('');

  return renderEmailLayout({
    title: escapeHtml(subject),
    preheader: 'A reminder about the remaining balance for your photo booth.',
    bodyHtml,
  });
}
