import { formatDateTimeToronto } from '@/lib/dates';

export function formatClientNoteTimestamp(createdAt: string): string {
  return formatDateTimeToronto(createdAt, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
