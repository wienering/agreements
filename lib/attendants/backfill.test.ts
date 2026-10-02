import { describe, expect, it } from 'vitest';
import { attendantIdFromBackdropUrl } from '@/lib/attendantIdentity';
import { planAttendantBackfill, type BackfillLink } from '@/lib/attendants/backfill';

const ID_A = 'cmgiq33jp0000ib044hfii2vk';
const ID_B = 'cmgiq384v0001ib047f12dbqo';

function link(id: string, name: string, url: string, attendantId: string | null = null): BackfillLink {
  return { id, name, url, attendantId };
}

describe('attendantIdFromBackdropUrl', () => {
  it('reads the ID from /select/{id} and ?attendantId={id}', () => {
    expect(attendantIdFromBackdropUrl(`https://backdrops.example.com/select/${ID_A}`)).toBe(ID_A);
    expect(attendantIdFromBackdropUrl(`https://backdrops.example.com/select/${ID_A}?x=1`)).toBe(ID_A);
    expect(attendantIdFromBackdropUrl(`https://backdrops.example.com/?attendantId=${ID_B}`)).toBe(ID_B);
  });

  it('returns null for missing or invalid IDs', () => {
    expect(attendantIdFromBackdropUrl('https://backdrops.example.com/')).toBeNull();
    expect(attendantIdFromBackdropUrl('https://backdrops.example.com/select/not-an-id')).toBeNull();
    expect(attendantIdFromBackdropUrl('not a url')).toBeNull();
  });
});

describe('planAttendantBackfill', () => {
  it('creates one attendant per ID and links each backdrop link', () => {
    const plan = planAttendantBackfill(
      [
        link('l1', 'Ian', `https://b.example.com/select/${ID_A}`),
        link('l2', 'Daisy', `https://b.example.com/select/${ID_B}`),
      ],
      [],
    );
    expect(plan.create).toEqual([
      { externalId: ID_A, name: 'Ian' },
      { externalId: ID_B, name: 'Daisy' },
    ]);
    expect(plan.link.map((l) => l.linkId)).toEqual(['l1', 'l2']);
    expect(plan.problems).toEqual([]);
  });

  it('is safe to re-run: existing attendants are reused and linked links are left alone', () => {
    const plan = planAttendantBackfill(
      [
        link('l1', 'Ian', `https://b.example.com/select/${ID_A}`, 'att_1'),
        link('l2', 'Ian (2)', `https://b.example.com/select/${ID_A}`),
      ],
      [{ id: 'att_1', name: 'Ian', externalId: ID_A }],
    );
    expect(plan.create).toEqual([]);
    expect(plan.alreadyLinked.map((l) => l.linkId)).toEqual(['l1']);
    expect(plan.link.map((l) => l.linkId)).toEqual(['l2']);
  });

  it('reports links with no ID or with conflicting names instead of guessing', () => {
    const plan = planAttendantBackfill(
      [
        link('l1', 'Nobody', 'https://b.example.com/'),
        link('l2', 'Ian', `https://b.example.com/select/${ID_A}`),
        link('l3', 'Mark', `https://b.example.com/?attendantId=${ID_A}`),
      ],
      [],
    );
    expect(plan.create).toEqual([]);
    expect(plan.link).toEqual([]);
    expect(plan.problems.map((p) => p.linkId)).toEqual(['l1', 'l2', 'l3']);
  });

  it('reports a link already tied to a different attendant', () => {
    const plan = planAttendantBackfill(
      [link('l1', 'Ian', `https://b.example.com/select/${ID_A}`, 'att_2')],
      [
        { id: 'att_1', name: 'Ian', externalId: ID_A },
        { id: 'att_2', name: 'Daisy', externalId: ID_B },
      ],
    );
    expect(plan.link).toEqual([]);
    expect(plan.problems).toHaveLength(1);
  });
});
