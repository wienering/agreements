import { describe, expect, it } from 'vitest';
import {
  compareLeadsForPrimary,
  foldLeadsByEmail,
  sortLeadsByPrimaryRule,
  type LeadForDedup,
} from '@/lib/leads/dedup';

function lead(partial: Partial<LeadForDedup> & Pick<LeadForDedup, 'id' | 'email'>): LeadForDedup {
  return {
    eventDate: null,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    ...partial,
  };
}

describe('compareLeadsForPrimary / sortLeadsByPrimaryRule', () => {
  it('prefers soonest eventDate', () => {
    const a = lead({ id: 'a', email: 'x@y.com', eventDate: new Date('2026-06-01') });
    const b = lead({ id: 'b', email: 'x@y.com', eventDate: new Date('2026-05-01') });
    expect(compareLeadsForPrimary(a, b)).toBeGreaterThan(0);
    expect(sortLeadsByPrimaryRule([a, b])[0].id).toBe('b');
  });

  it('puts null eventDate last', () => {
    const dated = lead({ id: 'd', email: 'x@y.com', eventDate: new Date('2026-06-01') });
    const undated = lead({ id: 'u', email: 'x@y.com', eventDate: null });
    expect(sortLeadsByPrimaryRule([undated, dated])[0].id).toBe('d');
  });

  it('tie-breaks by most recent createdAt', () => {
    const older = lead({
      id: 'old',
      email: 'x@y.com',
      eventDate: new Date('2026-06-01'),
      createdAt: new Date('2026-01-01'),
    });
    const newer = lead({
      id: 'new',
      email: 'x@y.com',
      eventDate: new Date('2026-06-01'),
      createdAt: new Date('2026-02-01'),
    });
    expect(sortLeadsByPrimaryRule([older, newer])[0].id).toBe('new');
  });
});

describe('foldLeadsByEmail', () => {
  it('groups case-insensitively and trims email', () => {
    const leads = [
      lead({ id: '1', email: ' Alice@Example.com ', eventDate: new Date('2026-06-01') }),
      lead({ id: '2', email: 'alice@example.com', eventDate: new Date('2026-05-01') }),
      lead({ id: '3', email: 'other@example.com' }),
    ];
    const folded = foldLeadsByEmail(leads);
    expect(folded).toHaveLength(2);

    const alice = folded.find((f) => f.primary.email.trim().toLowerCase() === 'alice@example.com');
    expect(alice?.primary.id).toBe('2');
    expect(alice?.others.map((o) => o.id)).toEqual(['1']);
  });

  it('returns single primary with empty others for unique emails', () => {
    const folded = foldLeadsByEmail([lead({ id: '1', email: 'a@b.com' })]);
    expect(folded).toEqual([{ primary: expect.objectContaining({ id: '1' }), others: [] }]);
  });
});
