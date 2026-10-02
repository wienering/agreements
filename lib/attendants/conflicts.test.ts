import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFLICT_BUFFERS,
  parseConflictBuffers,
  type ConflictBuffers,
} from '@/lib/attendants/conflictSettings';
import {
  conflictsForAssignment,
  findAttendantConflicts,
  type ConflictAgreement,
} from '@/lib/attendants/conflicts';

// October dates are Toronto daylight time (UTC−4). Event dates are stored at noon UTC.
const OCT_10 = new Date('2026-10-10T12:00:00.000Z');
const OCT_11 = new Date('2026-10-11T12:00:00.000Z');

const noDetails = {
  eventDate: null,
  eventLocation: null,
  eventStartTime: null,
  eventDuration: null,
  eventPackage: null,
};

function job(
  id: string,
  options: {
    attendantId?: string | null;
    date?: Date;
    start?: string | null;
    duration?: string | null;
    status?: string;
    eventId?: string | null;
    archived?: boolean;
    cancelledAt?: Date | null;
    createdAt?: Date;
    location?: string | null;
  } = {},
): ConflictAgreement {
  return {
    id,
    status: options.status ?? 'SIGNED',
    archived: options.archived ?? false,
    cancelledAt: options.cancelledAt ?? null,
    createdAt: options.createdAt ?? new Date('2026-09-01T00:00:00.000Z'),
    eventId: options.eventId ?? `evt_${id}`,
    attendantId: options.attendantId === undefined ? 'att_ian' : options.attendantId,
    clientName: `Client ${id}`,
    client: noDetails,
    event: {
      ...noDetails,
      eventDate: options.date ?? OCT_10,
      eventStartTime: options.start === undefined ? '2:00 PM' : options.start,
      eventDuration: options.duration ?? '3 hours',
      eventLocation: options.location ?? null,
    },
  };
}

const conflicts = (jobs: ConflictAgreement[], buffers: ConflictBuffers = DEFAULT_CONFLICT_BUFFERS) =>
  findAttendantConflicts(jobs, buffers);

describe('findAttendantConflicts', () => {
  it('flags overlapping jobs for the same attendant on the same day', () => {
    // 2–5 PM and 4–7 PM overlap outright.
    const result = conflicts([job('a'), job('b', { start: '4:00 PM' })]);
    expect(result.get('a')).toMatchObject([{ kind: 'conflict', otherAgreementId: 'b' }]);
    expect(result.get('b')).toMatchObject([{ kind: 'conflict', otherAgreementId: 'a' }]);
  });

  it('flags jobs that leave less than the travel gap between teardown and setup', () => {
    // 2–5 PM job blocks 1:00–5:30 PM. A 7 PM job blocks from 6:00 PM: only 30 minutes to travel.
    const result = conflicts([job('a'), job('b', { start: '7:00 PM' })]);
    expect(result.get('a')?.[0].kind).toBe('conflict');
  });

  it('allows jobs exactly one travel gap apart', () => {
    // First block ends 5:30 PM; a 7:30 PM start blocks from 6:30 PM, exactly 60 minutes later.
    expect(conflicts([job('a'), job('b', { start: '7:30 PM' })]).size).toBe(0);
  });

  it('uses the buffer settings', () => {
    const none: ConflictBuffers = { setupMinutes: 0, teardownMinutes: 0, travelMinutes: 0 };
    expect(conflicts([job('a'), job('b', { start: '5:00 PM' })], none).size).toBe(0);
    expect(conflicts([job('a'), job('b', { start: '4:59 PM' })], none).size).toBe(2);
  });

  it('uses the default 3-hour duration when the duration cannot be read', () => {
    // 2 PM + 3 h default ends 5 PM; with buffers, a 6:30 PM start is too close.
    const result = conflicts([job('a', { duration: 'TBD' }), job('b', { start: '6:30 PM' })]);
    expect(result.get('a')?.[0].kind).toBe('conflict');
  });

  it('marks a same-day job with no start time as a possible conflict', () => {
    const result = conflicts([job('a'), job('b', { start: null })]);
    expect(result.get('a')).toMatchObject([{ kind: 'possible', otherAgreementId: 'b' }]);
    expect(result.get('b')).toMatchObject([{ kind: 'possible', otherAgreementId: 'a' }]);
  });

  it('ignores different attendants, different days and unassigned agreements', () => {
    expect(conflicts([job('a'), job('b', { attendantId: 'att_daisy' })]).size).toBe(0);
    expect(conflicts([job('a'), job('b', { date: OCT_11 })]).size).toBe(0);
    expect(conflicts([job('a'), job('b', { attendantId: null })]).size).toBe(0);
  });

  it('counts drafts, sent, signed and completed agreements', () => {
    for (const status of ['DRAFT', 'SENT', 'SIGNED', 'COMPLETED']) {
      expect(conflicts([job('a'), job('b', { status })]).size).toBe(2);
    }
  });

  it('ignores cancelled and archived agreements', () => {
    expect(conflicts([job('a'), job('b', { status: 'CANCELLED' })]).size).toBe(0);
    expect(conflicts([job('a'), job('b', { archived: true })]).size).toBe(0);
    expect(conflicts([job('a'), job('b', { cancelledAt: new Date() })]).size).toBe(0);
  });

  it('treats several agreements for one event and attendant as one job', () => {
    const sameEvent = [
      job('signed', { eventId: 'evt_1' }),
      job('draft', { eventId: 'evt_1', status: 'DRAFT', createdAt: new Date('2026-09-20') }),
    ];
    expect(conflicts(sameEvent).size).toBe(0);

    const result = conflicts([...sameEvent, job('other', { start: '3:00 PM' })]);
    // Both agreements for the event carry the warning; the other job sees the signed one.
    expect(result.get('signed')?.[0].otherAgreementId).toBe('other');
    expect(result.get('draft')?.[0].otherAgreementId).toBe('other');
    expect(result.get('other')).toHaveLength(1);
    expect(result.get('other')?.[0].otherAgreementId).toBe('signed');
  });

  it('describes the other job', () => {
    const result = conflicts([job('a'), job('b', { start: '4:00 PM', location: 'Royal York' })]);
    expect(result.get('a')?.[0]).toEqual({
      kind: 'conflict',
      otherAgreementId: 'b',
      otherClientName: 'Client b',
      dateKey: '2026-10-10',
      otherStart: '2026-10-10T20:00:00.000Z',
      otherEnd: '2026-10-10T23:00:00.000Z',
      otherLocation: 'Royal York',
    });
  });
});

describe('conflictsForAssignment', () => {
  it('shows what assigning an attendant would clash with', () => {
    const booked = [job('booked')];
    const candidate = job('new', { attendantId: null, start: '3:00 PM' });
    expect(conflictsForAssignment(candidate, 'att_ian', booked, DEFAULT_CONFLICT_BUFFERS)).toMatchObject([
      { kind: 'conflict', otherAgreementId: 'booked' },
    ]);
    expect(conflictsForAssignment(candidate, 'att_daisy', booked, DEFAULT_CONFLICT_BUFFERS)).toEqual([]);
    expect(conflictsForAssignment(candidate, null, booked, DEFAULT_CONFLICT_BUFFERS)).toEqual([]);
  });

  it("ignores the candidate's own stored record", () => {
    const stored = job('same', { attendantId: 'att_ian' });
    expect(conflictsForAssignment(stored, 'att_ian', [stored], DEFAULT_CONFLICT_BUFFERS)).toEqual([]);
  });
});

describe('parseConflictBuffers', () => {
  it('defaults to 60 minutes setup, 30 teardown and 60 travel', () => {
    expect(parseConflictBuffers(null)).toEqual({ setupMinutes: 60, teardownMinutes: 30, travelMinutes: 60 });
  });

  it('keeps valid stored values and replaces invalid ones with defaults', () => {
    expect(parseConflictBuffers({ setupMinutes: 45, teardownMinutes: -5, travelMinutes: 'x' })).toEqual({
      setupMinutes: 45,
      teardownMinutes: 30,
      travelMinutes: 60,
    });
  });
});
