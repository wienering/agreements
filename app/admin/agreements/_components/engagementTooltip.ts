import { escapeHtml } from '@/lib/htmlEscape';
import { formatDateToronto, torontoCalendarDaysBetween } from '@/lib/dates';
import type { Agreement } from './types';

const STATUS_BADGE: Record<string, string> = {
  SIGNED: 'bg-success',
  LIVE: 'bg-accent',
  DRAFT: 'bg-warn',
  COMPLETED: 'bg-success',
  CANCELLED: 'bg-alert',
};

function buildEngagementTooltipHtml(agreement: Agreement): string {
  const daysSinceEmailed = agreement.lastEmailedAt
    ? torontoCalendarDaysBetween(agreement.lastEmailedAt, new Date())
    : null;
  const viewCount = agreement.viewCount || 0;
  const lastViewed = agreement.lastViewedAt ? formatDateToronto(agreement.lastViewedAt) : null;
  const needsFollowUp = agreement.status === 'LIVE' && daysSinceEmailed && daysSinceEmailed >= 3;
  const notViewed = viewCount === 0;
  const statusClass = STATUS_BADGE[agreement.status] ?? 'bg-admin-muted';

  const lastEmailText = agreement.lastEmailedAt
    ? 'Last: ' + escapeHtml(formatDateToronto(agreement.lastEmailedAt))
    : 'Never emailed';
  const lastViewText = lastViewed ? 'Last: ' + escapeHtml(lastViewed) : 'Never viewed';

  const followUpHtml = needsFollowUp
    ? '<div class="flex items-center gap-2 rounded border border-warn bg-admin-surface-raised px-3 py-2.5"><span class="text-sm"><i class="fi fi-rr-bell" aria-hidden="true"></i></span><div><div class="text-xs font-semibold text-warn">Follow-up needed</div><div class="text-[11px] text-admin-muted">' +
      escapeHtml(String(daysSinceEmailed)) +
      ' days since last email</div></div></div>'
    : '';

  const viewIcon = notViewed
    ? 'fi fi-rr-circle-exclamation'
    : 'fi fi-rr-eye';
  const viewBox = notViewed
    ? 'bg-[color-mix(in_srgb,var(--warn)_15%,transparent)]'
    : 'bg-admin-surface-raised';
  const viewText = notViewed ? 'text-warn' : 'text-admin-text';

  return (
    '<div class="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-admin-hairline bg-admin-surface"></div>' +
    '<div class="flex items-center gap-2 border-b border-admin-hairline bg-admin-surface-raised px-4 py-3">' +
    '<span class="text-base"><i class="fi fi-rr-chart-line-up" aria-hidden="true"></i></span>' +
    '<span class="text-sm font-bold text-admin-text">Engagement</span>' +
    '<span class="ml-auto rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ' +
    statusClass +
    '">' +
    escapeHtml(agreement.status) +
    '</span></div>' +
    '<div class="px-4 py-3.5">' +
    '<div class="mb-3.5 border-b border-admin-hairline pb-3.5">' +
    '<div class="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-admin-muted">Agreement</div>' +
    '<div class="mb-2.5 text-[13px] font-semibold leading-snug text-admin-text">' +
    escapeHtml(agreement.template.title) +
    '</div>' +
    '<div class="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-admin-muted">Email</div>' +
    '<div class="break-all text-xs text-admin-text">' +
    escapeHtml(agreement.client.email) +
    '</div></div>' +
    '<div class="mb-3 flex items-center gap-2.5">' +
    '<div class="flex h-8 w-8 items-center justify-center rounded bg-admin-surface-raised text-sm"><i class="fi fi-rr-envelope" aria-hidden="true"></i></div>' +
    '<div class="flex-1"><div class="text-sm font-semibold text-admin-text">' +
    (agreement.emailSendCount || 0) +
    ' email' +
    (agreement.emailSendCount !== 1 ? 's' : '') +
    ' sent</div><div class="text-[11px] text-admin-muted">' +
    lastEmailText +
    '</div></div></div>' +
    '<div class="flex items-center gap-2.5' +
    (needsFollowUp || notViewed ? ' mb-3' : '') +
    '">' +
    '<div class="flex h-8 w-8 items-center justify-center rounded text-sm ' +
    viewBox +
    '"><i class="' +
    viewIcon +
    '" aria-hidden="true"></i></div>' +
    '<div class="flex-1"><div class="text-sm font-semibold ' +
    viewText +
    '">' +
    viewCount +
    ' view' +
    (viewCount !== 1 ? 's' : '') +
    (notViewed ? ' - Not viewed!' : '') +
    '</div><div class="text-[11px] text-admin-muted">' +
    lastViewText +
    '</div></div></div>' +
    followUpHtml +
    '</div>'
  );
}

export function showEngagementTooltip(anchor: HTMLElement, agreement: Agreement) {
  document.querySelectorAll('.engagement-tooltip').forEach((node) => node.remove());
  const tooltip = document.createElement('div');
  tooltip.className =
    'engagement-tooltip fixed z-[1000] min-w-[260px] max-w-[min(360px,90vw)] overflow-hidden rounded border border-admin-hairline bg-white text-[13px] text-admin-text shadow-[0_20px_40px_rgba(0,0,0,0.25)]';
  tooltip.setAttribute('data-surface', 'admin');

  const rect = anchor.getBoundingClientRect();
  const gap = 8;
  const estimatedWidth = 280;
  let left = rect.right + gap;
  let top = rect.top + rect.height / 2;
  let transform = 'translateY(-50%)';
  if (left + estimatedWidth > window.innerWidth - 8) {
    left = Math.max(8, Math.min(rect.left, window.innerWidth - estimatedWidth - 8));
    top = rect.bottom + gap;
    transform = 'none';
  }
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.style.transform = transform;
  tooltip.innerHTML = buildEngagementTooltipHtml(agreement);
  document.body.appendChild(tooltip);
}

export function hideEngagementTooltip() {
  document.querySelector('.engagement-tooltip')?.remove();
}
