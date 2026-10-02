import { describe, expect, it } from 'vitest';
import { buildAttendantGroupSlug, slugifyAttendantGroupName } from './groupSlug';

describe('attendant group slugs', () => {
  it('slugifies a group name', () => {
    expect(slugifyAttendantGroupName('Toronto Team')).toBe('toronto-team');
  });

  it('falls back when the name has no letters or digits', () => {
    expect(slugifyAttendantGroupName('!!!')).toBe('group');
  });

  it('appends a random 10-character suffix', () => {
    expect(buildAttendantGroupSlug('Toronto Team')).toMatch(/^toronto-team-[a-z0-9]{10}$/);
  });

  it('does not reuse the same suffix on every call', () => {
    const first = buildAttendantGroupSlug('Toronto Team');
    const second = buildAttendantGroupSlug('Toronto Team');
    expect(first).not.toBe(second);
  });
});
