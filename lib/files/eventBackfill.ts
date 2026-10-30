/**
 * Plans which Event each existing ClientFile belongs to, now that uploads are per-event.
 * Rule 'prior': the client's most recent dated event on or before the upload day.
 * Rule 'next': the client's first dated event on or after the upload day.
 * If there is no such event, or two events share that date, the file is left unassigned.
 * Days are compared in UTC.
 */

export type BackfillFile = {
  id: string;
  clientId: string;
  eventId: string | null;
  fileName: string;
  createdAt: Date;
};

export type BackfillEvent = {
  id: string;
  clientId: string;
  eventDate: Date | null;
};

export type BackfillRule = 'prior' | 'next';

export type FileAssignment =
  | { fileId: string; kind: 'already_assigned'; eventId: string }
  | { fileId: string; kind: 'assign'; eventId: string }
  | { fileId: string; kind: 'unassigned'; reason: 'no_matching_event' | 'tie' };

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function planFileEventAssignments(
  files: BackfillFile[],
  events: BackfillEvent[],
  rule: BackfillRule,
): FileAssignment[] {
  const eventsByClient = new Map<string, BackfillEvent[]>();
  for (const event of events) {
    const list = eventsByClient.get(event.clientId) ?? [];
    list.push(event);
    eventsByClient.set(event.clientId, list);
  }

  return files.map((file): FileAssignment => {
    if (file.eventId) {
      return { fileId: file.id, kind: 'already_assigned', eventId: file.eventId };
    }

    const uploadDay = utcDay(file.createdAt);
    const candidates = (eventsByClient.get(file.clientId) ?? [])
      .filter((e): e is BackfillEvent & { eventDate: Date } => e.eventDate !== null)
      .map((e) => ({ id: e.id, day: utcDay(e.eventDate) }))
      .filter((e) => (rule === 'prior' ? e.day <= uploadDay : e.day >= uploadDay));
    if (candidates.length === 0) {
      return { fileId: file.id, kind: 'unassigned', reason: 'no_matching_event' };
    }

    const days = candidates.map((e) => e.day);
    const target = rule === 'prior' ? Math.max(...days) : Math.min(...days);
    const top = candidates.filter((e) => e.day === target);
    if (top.length > 1) {
      return { fileId: file.id, kind: 'unassigned', reason: 'tie' };
    }
    return { fileId: file.id, kind: 'assign', eventId: top[0].id };
  });
}
