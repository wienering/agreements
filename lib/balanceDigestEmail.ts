import {
  formatDaysUntilEvent,
} from '@/lib/balanceDigest';
import type { BalanceDigestRow } from '@/lib/balanceDigestQuery';
import { formatDateToronto, formatEventDateToronto } from '@/lib/dates';
import { renderCtaButtonPair, renderEmailLayout } from '@/lib/email/layout';
import { escapeHtml } from '@/lib/htmlEscape';
import type { FollowupDigestItem, FollowupDigestSections } from '@/lib/followups/digest';

export type BalanceDigestLinks = {
  markPaidUrl: string;
  remindUrl: string;
  snoozeUrl: string;
  adminUrl: string;
};

export type BalanceDigestEmailBlock = BalanceDigestLinks & {
  clientName: string;
  eventDateLabel: string;
  daysUntilLabel: string;
  packageLine: string | null;
  paymentStatus: string;
  reminderSentLabel: string | null;
};

function formatCad(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export function packageLineFor(row: Pick<BalanceDigestRow, 'packageName' | 'packagePrice'>): string | null {
  const name = row.packageName?.trim() || null;
  const price =
    row.packagePrice === null || Number.isNaN(row.packagePrice) ? null : formatCad(row.packagePrice);
  if (name && price) return `${name} · ${price}`;
  return name || price;
}

export function digestBlockFromRow(
  row: BalanceDigestRow,
  links: BalanceDigestLinks,
  now = new Date(),
): BalanceDigestEmailBlock {
  const reminderSentLabel = row.balanceReminderSentAt
    ? `Reminder last sent ${formatDateToronto(row.balanceReminderSentAt, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}`
    : null;

  return {
    clientName: row.clientName || 'Client',
    eventDateLabel: formatEventDateToronto(row.eventDate),
    daysUntilLabel: formatDaysUntilEvent(row.eventDate, now),
    packageLine: packageLineFor(row),
    paymentStatus: row.paymentStatus?.trim() || 'Not set',
    reminderSentLabel,
    ...links,
  };
}

function detailLine(text: string): string {
  return `<p style="margin:0 0 6px 0;">${escapeHtml(text)}</p>`;
}

function renderBlock(block: BalanceDigestEmailBlock): string {
  const packageHtml = block.packageLine ? detailLine(block.packageLine) : '';
  const reminderHtml = block.reminderSentLabel ? detailLine(block.reminderSentLabel) : '';

  const primary = renderCtaButtonPair(
    { label: 'Mark as paid', url: block.markPaidUrl },
    { label: 'Email client a reminder', url: block.remindUrl, variant: 'outlined' },
  );
  const secondary = renderCtaButtonPair(
    { label: 'Snooze 3 days', url: block.snoozeUrl, variant: 'outlined' },
    { label: 'Open in admin', url: block.adminUrl, variant: 'outlined' },
  );

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 8px 0;">
  <tr>
    <td style="padding:8px 0 0 0;font-family:'Libre Franklin', Helvetica, Arial, sans-serif;font-size:15px;line-height:1.65;color:#1A1A18;">
      <p style="margin:0 0 8px 0;font-size:18px;line-height:1.3;font-weight:600;">${escapeHtml(block.clientName)}</p>
      ${detailLine(block.eventDateLabel)}
      ${detailLine(block.daysUntilLabel)}
      ${packageHtml}
      ${detailLine(`Payment: ${block.paymentStatus}`)}
      ${reminderHtml}
      ${primary}
      ${secondary}
    </td>
  </tr>
</table>`;
}

function plainBlock(block: BalanceDigestEmailBlock): string {
  const lines = [
    block.clientName,
    block.eventDateLabel,
    block.daysUntilLabel,
    block.packageLine,
    `Payment: ${block.paymentStatus}`,
    block.reminderSentLabel,
    `Mark as paid: ${block.markPaidUrl}`,
    `Email client a reminder: ${block.remindUrl}`,
    `Snooze 3 days: ${block.snoozeUrl}`,
    `Open in admin: ${block.adminUrl}`,
  ].filter((line): line is string => Boolean(line));
  return lines.join('\n');
}

const EMPTY_FOLLOWUPS: FollowupDigestSections = { goingOut: [], held: [] };

function sectionHeading(text: string): string {
  return `<p style="margin:28px 0 10px 0;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#5E5E58;">${escapeHtml(text)}</p>`;
}

function renderFollowupItems(items: FollowupDigestItem[]): string {
  return items
    .map(
      (item) =>
        `<p style="margin:0 0 10px 0;"><a href="${escapeHtml(item.adminUrl)}" style="color:#1E3B31;font-weight:600;text-decoration:underline;">${escapeHtml(item.clientName)}</a><br><span style="color:#5E5E58;font-size:14px;">${escapeHtml(item.label)}</span></p>`,
    )
    .join('');
}

function plainFollowupItems(heading: string, items: FollowupDigestItem[]): string {
  return [heading, ...items.map((item) => `${item.clientName}: ${item.label}\n${item.adminUrl}`)].join('\n');
}

function followupSubject(followups: FollowupDigestSections): string {
  const parts = [];
  if (followups.goingOut.length > 0) parts.push(`${followups.goingOut.length} going out today`);
  if (followups.held.length > 0) parts.push(`${followups.held.length} held`);
  return `Follow-ups: ${parts.join(', ')}`;
}

export function renderBalanceDigestEmail(
  blocks: BalanceDigestEmailBlock[],
  followups: FollowupDigestSections = EMPTY_FOLLOWUPS,
): {
  subject: string;
  html: string;
  text: string;
} {
  const count = blocks.length;
  const hasFollowups = followups.goingOut.length > 0 || followups.held.length > 0;
  const subject =
    count === 0 && hasFollowups
      ? followupSubject(followups)
      : count === 1
        ? 'Balance due: 1 event in the next 10 days'
        : `Balance due: ${count} events in the next 10 days`;

  const intro =
    'Signed events in the next 10 days whose balance is not marked paid. Each link opens a confirmation page. Nothing changes until you confirm.';

  const htmlParts: string[] = [];
  const textParts: string[] = [];
  if (count > 0) {
    htmlParts.push(`<p style="margin:0 0 20px 0;">${escapeHtml(intro)}</p>${blocks.map(renderBlock).join('')}`);
    textParts.push([intro, '', ...blocks.map(plainBlock)].join('\n\n'));
  }
  if (followups.goingOut.length > 0) {
    htmlParts.push(`${sectionHeading('Follow-ups going out today')}${renderFollowupItems(followups.goingOut)}`);
    textParts.push(plainFollowupItems('Follow-ups going out today', followups.goingOut));
  }
  if (followups.held.length > 0) {
    htmlParts.push(`${sectionHeading('Galleries held (balance owing)')}${renderFollowupItems(followups.held)}`);
    textParts.push(plainFollowupItems('Galleries held (balance owing)', followups.held));
  }

  return {
    subject,
    html: renderEmailLayout({
      title: subject,
      preheader: count > 0 ? intro : subject,
      bodyHtml: htmlParts.join(''),
    }),
    text: textParts.join('\n\n'),
  };
}
