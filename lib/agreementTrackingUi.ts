import { AgreementActivityType } from '@prisma/client';
import { formatDateTimeToronto, torontoCalendarDaysBetween } from '@/lib/dates';

export type AgreementLegacyTrackingFields = {
  status: string;
  lastEmailedAt: string | null;
  emailSendCount: number;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  signedAt: string | null;
  cancelledAt: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
};

export type AgreementActivityRow = {
  id: string;
  type: AgreementActivityType;
  meta: unknown;
  createdAt: string;
};

export type AgreementTimelineEntry = {
  id: string;
  type: AgreementActivityType;
  createdAt: string;
  meta: Record<string, unknown> | null;
  fromLegacy: boolean;
};

export function formatActivityAbsoluteTime(createdAt: string): string {
  return formatDateTimeToronto(createdAt, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateInput: string | Date, nowMs = Date.now()): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';

  const diffSec = Math.floor((nowMs - date.getTime()) / 1000);
  if (diffSec < 45) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;

  const diffDay = Math.floor(diffMin / 60 / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;

  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}

function metaRecord(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta as Record<string, unknown>;
}

export function getActivityTimelineLabel(
  type: AgreementActivityType,
  meta: unknown,
): string {
  const m = metaRecord(meta);

  switch (type) {
    case 'SENT': {
      const sendCount = typeof m?.sendCount === 'number' ? m.sendCount : null;
      return sendCount && sendCount > 1
        ? `Agreement sent (send #${sendCount})`
        : 'Agreement sent';
    }
    case 'VIEWED':
      return 'Viewed by client';
    case 'SIGNED': {
      const signer = m?.signer === 'secondSigner' ? 'second signer' : m?.signer === 'client' ? 'client' : null;
      return signer ? `Fully signed (${signer})` : 'Fully signed';
    }
    case 'SIGNED_SECOND':
      if (m?.signer === 'client') return 'Client signed';
      if (m?.signer === 'secondSigner') return 'Second signer signed';
      return 'One signer signed';
    case 'REMINDER_SENT': {
      const recipient =
        m?.recipient === 'secondSigner'
          ? 'second signer'
          : m?.recipient === 'client'
            ? 'client'
            : null;
      const reminderNumber =
        typeof m?.reminderNumber === 'number' ? m.reminderNumber : null;
      const base = recipient
        ? `Reminder sent automatically (to ${recipient})`
        : 'Reminder sent automatically';
      return reminderNumber ? `${base}, #${reminderNumber}` : base;
    }
    case 'CANCELLED':
      return 'Cancelled';
    case 'NOTE_ADDED':
      return 'Client added a note';
    case 'BACKDROP_SELECTED': {
      const name =
        typeof m?.backdropName === 'string' && m.backdropName.trim()
          ? m.backdropName.trim()
          : null;
      const cleared = m?.backdropName === null || m?.backdropName === '';
      if (cleared) return 'Backdrop selection cleared';
      return name ? `Backdrop selected: ${name}` : 'Backdrop selected';
    }
    case 'PAYMENT_MARKED_PAID':
      return 'Marked paid from the balance digest';
    case 'BALANCE_REMINDER_SENT':
      return 'Balance reminder sent to client';
    default:
      return type;
  }
}

function hasActivityType(activities: AgreementActivityRow[], type: AgreementActivityType): boolean {
  return activities.some((row) => row.type === type);
}

export function buildAgreementTimeline(
  activities: AgreementActivityRow[],
  legacy: AgreementLegacyTrackingFields,
): AgreementTimelineEntry[] {
  const entries: AgreementTimelineEntry[] = activities.map((row) => ({
    id: row.id,
    type: row.type,
    createdAt: row.createdAt,
    meta: metaRecord(row.meta),
    fromLegacy: false,
  }));

  if (
    !hasActivityType(activities, 'SENT') &&
    legacy.lastEmailedAt &&
    legacy.emailSendCount > 0
  ) {
    entries.push({
      id: 'legacy:sent',
      type: 'SENT',
      createdAt: legacy.lastEmailedAt,
      meta: { sendCount: legacy.emailSendCount },
      fromLegacy: true,
    });
  }

  if (!hasActivityType(activities, 'VIEWED') && legacy.firstViewedAt) {
    entries.push({
      id: 'legacy:viewed',
      type: 'VIEWED',
      createdAt: legacy.firstViewedAt,
      meta: null,
      fromLegacy: true,
    });
  }

  if (
    !hasActivityType(activities, 'SIGNED') &&
    legacy.signedAt &&
    (legacy.status === 'SIGNED' || legacy.status === 'COMPLETED')
  ) {
    entries.push({
      id: 'legacy:signed',
      type: 'SIGNED',
      createdAt: legacy.signedAt,
      meta: null,
      fromLegacy: true,
    });
  }

  if (
    !hasActivityType(activities, 'REMINDER_SENT') &&
    legacy.lastReminderAt &&
    legacy.reminderCount > 0
  ) {
    entries.push({
      id: 'legacy:reminder',
      type: 'REMINDER_SENT',
      createdAt: legacy.lastReminderAt,
      meta: null,
      fromLegacy: true,
    });
  }

  if (
    !hasActivityType(activities, 'CANCELLED') &&
    legacy.cancelledAt &&
    legacy.status === 'CANCELLED'
  ) {
    entries.push({
      id: 'legacy:cancelled',
      type: 'CANCELLED',
      createdAt: legacy.cancelledAt,
      meta: null,
      fromLegacy: true,
    });
  }

  return entries.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function getUnsignedEventUrgency(
  eventDate: Date | null,
  now = new Date(),
): 'none' | 'warning' | 'danger' {
  if (!eventDate || Number.isNaN(eventDate.getTime())) return 'none';

  const diffDays = torontoCalendarDaysBetween(now, eventDate);
  if (diffDays < 0 || diffDays > 14) return 'none';
  if (diffDays <= 3) return 'danger';
  return 'warning';
}

export function buildAgreementStatusHint(agreement: {
  status: string;
  signedAt?: string | null;
  cancelledAt?: string | null;
  lastEmailedAt?: string | null;
  emailSendCount?: number;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  viewCount?: number;
  event?: { eventDate?: string | null } | null;
  client?: { eventDate?: string | null };
}): { text: string; warn: boolean; urgency: 'none' | 'warning' | 'danger' } {
  const { status } = agreement;

  if (status === 'CANCELLED') {
    const rel = agreement.cancelledAt ? formatRelativeTime(agreement.cancelledAt) : '';
    return { text: rel ? `Cancelled ${rel}` : 'Cancelled', warn: false, urgency: 'none' };
  }

  if (status === 'SIGNED' || status === 'COMPLETED') {
    const rel = agreement.signedAt ? formatRelativeTime(agreement.signedAt) : '';
    return { text: rel ? `Signed ${rel}` : 'Signed', warn: false, urgency: 'none' };
  }

  const sent =
    status !== 'DRAFT' &&
    Boolean(agreement.lastEmailedAt) &&
    (agreement.emailSendCount || 0) > 0;

  if (status === 'DRAFT' || !sent) {
    return { text: 'Not sent', warn: false, urgency: 'none' };
  }

  const eventDateRaw = agreement.event?.eventDate || agreement.client?.eventDate;
  const eventDate = eventDateRaw ? new Date(eventDateRaw) : null;
  const urgency = getUnsignedEventUrgency(eventDate);
  const warn = urgency !== 'none';

  const hasViewed =
    Boolean(agreement.firstViewedAt) || (agreement.viewCount || 0) > 0;

  if (hasViewed) {
    const viewedAt = agreement.firstViewedAt || agreement.lastViewedAt;
    const rel = viewedAt ? formatRelativeTime(viewedAt) : '';
    return { text: rel ? `Viewed ${rel}` : 'Viewed', warn, urgency };
  }

  const rel = agreement.lastEmailedAt ? formatRelativeTime(agreement.lastEmailedAt) : '';
  return { text: rel ? `Sent ${rel} · not viewed` : 'Sent · not viewed', warn, urgency };
}
