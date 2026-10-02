import {
  resolveEventSchedule,
  selectOneAgreementPerEvent,
  type EventSchedule,
  type EventScheduleSource,
} from '@/lib/calendarFeed';
import type { ConflictBuffers } from '@/lib/attendants/conflictSettings';

/** Statuses that hold an attendant's time. Drafts count: some real bookings stay as drafts. */
export const CONFLICT_STATUSES = ['DRAFT', 'SENT', 'LIVE', 'SIGNED', 'COMPLETED'] as const;

export type ConflictAgreement = EventScheduleSource & {
  id: string;
  status: string;
  archived: boolean;
  cancelledAt: Date | null;
  createdAt?: Date | null;
  eventId?: string | null;
  /** The attendant record behind the agreement's backdrop link. */
  attendantId: string | null;
  clientName: string;
};

export type AttendantConflict = {
  /** 'conflict': the time blocks overlap or leave less than the travel gap.
   *  'possible': same day, but at least one job has no start time to check. */
  kind: 'conflict' | 'possible';
  otherAgreementId: string;
  otherClientName: string;
  dateKey: string;
  /** The other job's start and end, when known (ISO strings). */
  otherStart: string | null;
  otherEnd: string | null;
  otherLocation: string | null;
};

type Job = {
  agreements: ConflictAgreement[];
  representative: ConflictAgreement;
  attendantId: string;
  schedule: EventSchedule;
};

const MINUTE = 60_000;

function countsForConflicts(a: ConflictAgreement): boolean {
  return (
    Boolean(a.attendantId) &&
    (CONFLICT_STATUSES as readonly string[]).includes(a.status) &&
    !a.archived &&
    !a.cancelledAt
  );
}

/**
 * Group agreements into jobs: several agreements for the same event and attendant are one job,
 * represented by the same agreement the calendar feed would show.
 */
function toJobs(agreements: ConflictAgreement[]): Job[] {
  const groups = new Map<string, ConflictAgreement[]>();
  for (const a of agreements) {
    if (!countsForConflicts(a)) continue;
    const key = a.eventId ? `event:${a.eventId}|${a.attendantId}` : `agreement:${a.id}`;
    const group = groups.get(key) ?? [];
    group.push(a);
    groups.set(key, group);
  }

  const jobs: Job[] = [];
  for (const group of groups.values()) {
    const representative = pickRepresentative(group);
    const schedule = resolveEventSchedule(representative);
    if (!schedule) continue;
    jobs.push({
      agreements: group,
      representative,
      attendantId: representative.attendantId as string,
      schedule,
    });
  }
  return jobs;
}

/** The agreement the calendar feed would show for this job: signed first, then newest. */
function pickRepresentative(group: ConflictAgreement[]): ConflictAgreement {
  const [chosen] = selectOneAgreementPerEvent(group.map((a) => ({ ...a, eventId: 'job' })));
  return group.find((a) => a.id === chosen.id) ?? group[0];
}

function blockOf(schedule: EventSchedule, buffers: ConflictBuffers) {
  if (!schedule.start || !schedule.end) return null;
  return {
    start: schedule.start.getTime() - buffers.setupMinutes * MINUTE,
    end: schedule.end.getTime() + buffers.teardownMinutes * MINUTE,
  };
}

/** How two jobs on the same day for the same attendant clash, or null when they don't. */
export function compareJobs(
  a: EventSchedule,
  b: EventSchedule,
  buffers: ConflictBuffers,
): AttendantConflict['kind'] | null {
  if (a.dateKey !== b.dateKey) return null;
  const blockA = blockOf(a, buffers);
  const blockB = blockOf(b, buffers);
  if (!blockA || !blockB) return 'possible';
  const travel = buffers.travelMinutes * MINUTE;
  const clear = blockA.end + travel <= blockB.start || blockB.end + travel <= blockA.start;
  return clear ? null : 'conflict';
}

function describe(job: Job, kind: AttendantConflict['kind']): AttendantConflict {
  const from = job.representative.event ?? job.representative.client;
  return {
    kind,
    otherAgreementId: job.representative.id,
    otherClientName: job.representative.clientName,
    dateKey: job.schedule.dateKey,
    otherStart: job.schedule.start?.toISOString() ?? null,
    otherEnd: job.schedule.end?.toISOString() ?? null,
    otherLocation: from.eventLocation?.trim() || null,
  };
}

/**
 * Double-bookings for every agreement: same attendant, same Toronto day, and time blocks
 * (start − setup to end + teardown) closer than the travel gap. A job with no start time on
 * a day the attendant has another job is a "possible" conflict. Warn-only: nothing is blocked.
 */
export function findAttendantConflicts(
  agreements: ConflictAgreement[],
  buffers: ConflictBuffers,
): Map<string, AttendantConflict[]> {
  const jobs = toJobs(agreements);
  const byAttendantDay = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = `${job.attendantId}|${job.schedule.dateKey}`;
    const list = byAttendantDay.get(key) ?? [];
    list.push(job);
    byAttendantDay.set(key, list);
  }

  const result = new Map<string, AttendantConflict[]>();
  const add = (job: Job, conflict: AttendantConflict) => {
    for (const a of job.agreements) {
      const list = result.get(a.id) ?? [];
      list.push(conflict);
      result.set(a.id, list);
    }
  };

  for (const sameDay of byAttendantDay.values()) {
    for (let i = 0; i < sameDay.length; i++) {
      for (let j = i + 1; j < sameDay.length; j++) {
        const kind = compareJobs(sameDay[i].schedule, sameDay[j].schedule, buffers);
        if (!kind) continue;
        add(sameDay[i], describe(sameDay[j], kind));
        add(sameDay[j], describe(sameDay[i], kind));
      }
    }
  }
  return result;
}

/** Conflicts one agreement would have if it were assigned to the given attendant. */
export function conflictsForAssignment(
  candidate: ConflictAgreement,
  attendantId: string | null,
  others: ConflictAgreement[],
  buffers: ConflictBuffers,
): AttendantConflict[] {
  if (!attendantId) return [];
  const withCandidate = [
    ...others.filter((a) => a.id !== candidate.id),
    { ...candidate, attendantId },
  ];
  return findAttendantConflicts(withCandidate, buffers).get(candidate.id) ?? [];
}
