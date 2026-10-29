import { describe, expect, it } from 'vitest';
import { isLikelyDuplicateClient, splitClientName } from '@/lib/mcp/tools/names';

describe('mcp names', () => {
  it('splits a simple full name', () => {
    expect(splitClientName('Samreen Khan')).toEqual({
      firstName: 'Samreen',
      lastName: 'Khan',
    });
  });

  it('treats same email as a duplicate', () => {
    expect(
      isLikelyDuplicateClient(
        { firstName: 'A', lastName: 'B', email: 'x@example.com' },
        { firstName: 'Z', lastName: 'Y', email: 'x@example.com' },
      ),
    ).toBe(true);
  });

  it('treats very similar names as duplicates', () => {
    expect(
      isLikelyDuplicateClient(
        { firstName: 'Samreen', lastName: 'Khan', email: 'a@example.com' },
        { firstName: 'Samreen', lastName: 'Khan', email: 'b@example.com' },
      ),
    ).toBe(true);
  });
});
