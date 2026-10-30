import { describe, expect, it } from 'vitest';
import { planFileEventAssignments, type BackfillEvent, type BackfillFile } from '@/lib/files/eventBackfill';

function file(overrides: Partial<BackfillFile> = {}): BackfillFile {
  return {
    id: 'f1',
    clientId: 'c1',
    eventId: null,
    fileName: 'Final.png',
    createdAt: new Date('2026-10-13T15:00:00.000Z'),
    ...overrides,
  };
}

function event(id: string, eventDate: string | null, clientId = 'c1'): BackfillEvent {
  return { id, clientId, eventDate: eventDate ? new Date(eventDate) : null };
}

describe('planFileEventAssignments, next rule', () => {
  it('picks the first event on or after the upload day, ignoring earlier events', () => {
    const events = [
      event('may', '2026-05-02T18:00:00.000Z'),
      event('oct15', '2026-10-15T18:00:00.000Z'),
      event('dec', '2026-12-01T18:00:00.000Z'),
    ];
    expect(planFileEventAssignments([file()], events, 'next')).toEqual([
      { fileId: 'f1', kind: 'assign', eventId: 'oct15' },
    ]);
  });

  it('counts an event earlier on the upload day', () => {
    const events = [event('same', '2026-10-13T01:00:00.000Z')];
    expect(planFileEventAssignments([file()], events, 'next')[0]).toMatchObject({ kind: 'assign', eventId: 'same' });
  });

  it('leaves the file unassigned when two events share the date', () => {
    const events = [event('a', '2026-10-15T14:00:00.000Z'), event('b', '2026-10-15T20:00:00.000Z')];
    expect(planFileEventAssignments([file()], events, 'next')[0]).toEqual({
      fileId: 'f1',
      kind: 'unassigned',
      reason: 'tie',
    });
  });

  it('leaves the file unassigned with no later event, and ignores undated and other clients\' events', () => {
    const events = [
      event('past', '2026-05-02T18:00:00.000Z'),
      event('undated', null),
      event('other', '2026-10-20T18:00:00.000Z', 'c2'),
    ];
    expect(planFileEventAssignments([file()], events, 'next')[0]).toEqual({
      fileId: 'f1',
      kind: 'unassigned',
      reason: 'no_matching_event',
    });
  });

  it('never changes a file that already has an event', () => {
    const events = [event('oct15', '2026-10-15T18:00:00.000Z')];
    expect(planFileEventAssignments([file({ eventId: 'kept' })], events, 'next')[0]).toEqual({
      fileId: 'f1',
      kind: 'already_assigned',
      eventId: 'kept',
    });
  });
});

describe('planFileEventAssignments, prior rule', () => {
  it('picks the most recent event on or before the upload day', () => {
    const events = [event('may', '2026-05-02T18:00:00.000Z'), event('oct15', '2026-10-15T18:00:00.000Z')];
    expect(planFileEventAssignments([file()], events, 'prior')[0]).toMatchObject({ kind: 'assign', eventId: 'may' });
  });
});
