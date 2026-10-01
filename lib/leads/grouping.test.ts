import { describe, expect, it } from 'vitest';
import {
  COMING_UP_DAYS,
  getLeadGroup,
  URGENT_DAYS,
} from '@/lib/leads/grouping';

describe('getLeadGroup', () => {
  const now = new Date('2026-04-01T16:00:00Z');

  it('returns no_date when eventDate is null', () => {
    expect(getLeadGroup({ eventDate: null }, now)).toBe('no_date');
  });

  it('returns urgent for today or past event dates', () => {
    expect(getLeadGroup({ eventDate: new Date('2026-04-01T20:00:00Z') }, now)).toBe('urgent');
    expect(getLeadGroup({ eventDate: new Date('2026-03-20T16:00:00Z') }, now)).toBe('urgent');
  });

  it(`returns urgent when within ${URGENT_DAYS} days`, () => {
    expect(getLeadGroup({ eventDate: new Date('2026-04-10T16:00:00Z') }, now)).toBe('urgent');
    expect(getLeadGroup({ eventDate: new Date('2026-04-15T16:00:00Z') }, now)).toBe('urgent');
  });

  it(`returns coming_up when within ${COMING_UP_DAYS} days but after urgent window`, () => {
    expect(getLeadGroup({ eventDate: new Date('2026-04-16T16:00:00Z') }, now)).toBe('coming_up');
    expect(getLeadGroup({ eventDate: new Date('2026-06-30T16:00:00Z') }, now)).toBe('coming_up');
  });

  it('returns later when beyond coming_up window', () => {
    expect(getLeadGroup({ eventDate: new Date('2026-07-01T16:00:00Z') }, now)).toBe('later');
  });
});
