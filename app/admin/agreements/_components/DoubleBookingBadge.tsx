import { formatDateTimeToronto, formatDateToronto, parseTorontoCalendarDateKey } from '@/lib/dates';
import { UIcon } from '../../../components/UIcon';
import type { AttendantConflict } from './types';

function timeLabel(iso: string): string {
  return formatDateTimeToronto(iso, { hour: 'numeric', minute: '2-digit' }, 'en-US');
}

/** One line describing the other job, e.g. "Jane Smith · Sat, Oct 10 · 4:00 PM–7:00 PM · Royal York". */
export function describeConflict(conflict: AttendantConflict): string {
  const day = parseTorontoCalendarDateKey(conflict.dateKey);
  const parts = [
    conflict.otherClientName,
    day ? formatDateToronto(day, { weekday: 'short', month: 'short', day: 'numeric' }, 'en-US') : conflict.dateKey,
    conflict.otherStart && conflict.otherEnd
      ? `${timeLabel(conflict.otherStart)}–${timeLabel(conflict.otherEnd)}`
      : 'no start time',
    conflict.otherLocation,
  ];
  return parts.filter(Boolean).join(' · ');
}

export function conflictHeadline(conflicts: AttendantConflict[]): string {
  return conflicts.some((c) => c.kind === 'conflict') ? 'Double-booked' : 'Possible conflict';
}

/** Small row badge. Warn-only: it never stops anything. */
export function DoubleBookingBadge({ conflicts }: { conflicts: AttendantConflict[] }) {
  if (conflicts.length === 0) return null;
  const definite = conflicts.some((c) => c.kind === 'conflict');
  const title = conflicts
    .map((c) => `${c.kind === 'conflict' ? 'Clashes with' : 'Same day as'}: ${describeConflict(c)}`)
    .join('\n');
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-accent-on ${
        definite ? 'bg-alert' : 'bg-warn'
      }`}
    >
      <UIcon name={definite ? 'siren' : 'circle-exclamation'} className="text-[11px]" />
      {conflictHeadline(conflicts)}
    </span>
  );
}

/** Expanded list of the other jobs, for the row details and the drawer. */
export function ConflictList({ conflicts }: { conflicts: AttendantConflict[] }) {
  if (conflicts.length === 0) return null;
  return (
    <ul className="m-0 list-none space-y-1 p-0 text-xs">
      {conflicts.map((c) => (
        <li key={`${c.kind}-${c.otherAgreementId}`} className={c.kind === 'conflict' ? 'text-alert' : 'text-warn'}>
          {c.kind === 'conflict' ? 'Clashes with: ' : 'Same day, can’t check times: '}
          <a
            href={`/admin/agreements?agreement=${encodeURIComponent(c.otherAgreementId)}`}
            className="font-medium underline"
            onClick={(event) => event.stopPropagation()}
          >
            {describeConflict(c)}
          </a>
        </li>
      ))}
    </ul>
  );
}
