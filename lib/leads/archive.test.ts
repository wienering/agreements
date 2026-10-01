import { describe, expect, it } from 'vitest';
import {
  EVENT_PASSED_BUFFER_DAYS,
  getAutoArchiveReason,
  STALE_DAYS,
} from '@/lib/leads/archive';

describe('getAutoArchiveReason', () => {
  const now = new Date('2026-04-10T16:00:00Z');

  it('returns null when already archived', () => {
    expect(
      getAutoArchiveReason(
        {
          archivedAt: new Date('2026-01-01'),
          eventId: null,
          eventDate: new Date('2026-01-01'),
          lastContactedAt: null,
          createdAt: new Date('2025-01-01'),
        },
        now,
      ),
    ).toBeNull();
  });

  it('returns null when lead is linked to an event or agreement', () => {
    expect(
      getAutoArchiveReason(
        {
          archivedAt: null,
          eventId: 'evt-1',
          eventDate: new Date('2026-01-01'),
          lastContactedAt: null,
          createdAt: new Date('2025-01-01'),
        },
        now,
      ),
    ).toBeNull();

    expect(
      getAutoArchiveReason(
        {
          archivedAt: null,
          eventId: null,
          eventDate: new Date('2026-01-01'),
          lastContactedAt: null,
          createdAt: new Date('2025-01-01'),
          agreement: { id: 'agr-1' },
        },
        now,
      ),
    ).toBeNull();
  });

  it(`returns event_passed when event is more than ${EVENT_PASSED_BUFFER_DAYS} days ago`, () => {
    expect(
      getAutoArchiveReason(
        {
          archivedAt: null,
          eventId: null,
          eventDate: new Date('2026-04-07T16:00:00Z'), // 3 days before now
          lastContactedAt: now,
          createdAt: now,
        },
        now,
      ),
    ).toBe('event_passed');
  });

  it(`does not event_pass within the ${EVENT_PASSED_BUFFER_DAYS}-day buffer`, () => {
    expect(
      getAutoArchiveReason(
        {
          archivedAt: null,
          eventId: null,
          eventDate: new Date('2026-04-08T16:00:00Z'), // 2 days before
          lastContactedAt: now,
          createdAt: now,
        },
        now,
      ),
    ).toBeNull();
  });

  it(`returns stale when no contact for ${STALE_DAYS}+ days and event still upcoming`, () => {
    expect(
      getAutoArchiveReason(
        {
          archivedAt: null,
          eventId: null,
          eventDate: new Date('2026-08-01T16:00:00Z'),
          lastContactedAt: new Date('2025-12-01T16:00:00Z'),
          createdAt: new Date('2025-12-01T16:00:00Z'),
        },
        now,
      ),
    ).toBe('stale');
  });

  it('uses createdAt when lastContactedAt is null for stale check', () => {
    expect(
      getAutoArchiveReason(
        {
          archivedAt: null,
          eventId: null,
          eventDate: null,
          lastContactedAt: null,
          createdAt: new Date('2025-12-01T16:00:00Z'),
        },
        now,
      ),
    ).toBe('stale');
  });

  it('does not mark stale when recently contacted', () => {
    expect(
      getAutoArchiveReason(
        {
          archivedAt: null,
          eventId: null,
          eventDate: new Date('2026-08-01T16:00:00Z'),
          lastContactedAt: new Date('2026-03-01T16:00:00Z'),
          createdAt: new Date('2025-12-01T16:00:00Z'),
        },
        now,
      ),
    ).toBeNull();
  });
});
