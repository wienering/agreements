import { describe, expect, it } from 'vitest';
import { agreementLabel, filterEvents, type EventListItem } from '@/lib/events/list';

const client = { id: 'c1', firstName: 'Mandy', lastName: 'Yan', email: 'mandy@example.com' };

function event(id: string, eventDate: string | null, extra: Partial<EventListItem> = {}): EventListItem {
  return { id, clientId: 'c1', eventDate, client, agreements: [], ...extra };
}

// Noon UTC keeps these on the same Toronto calendar day.
const past = event('past', '2026-10-01T16:00:00.000Z');
const today = event('today', '2026-11-04T16:00:00.000Z');
const later = event('later', '2026-12-12T17:00:00.000Z', {
  eventType: 'Wedding',
  agreements: [{ id: 'a1', status: 'SIGNED' }],
});
const undated = event('undated', null);
const all = [later, undated, past, today];
const TODAY = '2026-11-04';

describe('filterEvents', () => {
  it('upcoming includes today and undated, soonest first, undated last', () => {
    expect(filterEvents(all, 'upcoming', '', TODAY).map((e) => e.id)).toEqual(['today', 'later', 'undated']);
  });

  it('past is newest first', () => {
    const older = event('older', '2026-09-01T16:00:00.000Z');
    expect(filterEvents([older, past], 'past', '', TODAY).map((e) => e.id)).toEqual(['past', 'older']);
  });

  it('no-agreement skips past events and ones with a live agreement', () => {
    const cancelledOnly = event('cancelled', '2026-12-01T17:00:00.000Z', {
      agreements: [{ id: 'a2', status: 'CANCELLED' }],
    });
    expect(filterEvents([...all, cancelledOnly], 'no-agreement', '', TODAY).map((e) => e.id)).toEqual([
      'today',
      'cancelled',
      'undated',
    ]);
  });

  it('searches client name and event details', () => {
    expect(filterEvents(all, 'all', 'wedding', TODAY).map((e) => e.id)).toEqual(['later']);
    expect(filterEvents(all, 'all', 'mandy yan', TODAY)).toHaveLength(4);
  });
});

describe('agreementLabel', () => {
  it('separates unsent drafts from shared ones', () => {
    expect(agreementLabel({ id: 'a', status: 'DRAFT', emailSendCount: 0 })).toBe('Draft, not sent');
    expect(agreementLabel({ id: 'a', status: 'DRAFT', emailSendCount: 0, firstViewedAt: '2026-11-01T00:00:00Z' })).toBe(
      'Draft, shared',
    );
    expect(agreementLabel({ id: 'a', status: 'SIGNED' })).toBe('Signed');
  });
});
