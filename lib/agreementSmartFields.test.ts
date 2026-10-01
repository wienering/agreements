import { describe, expect, it } from 'vitest';
import {
  applySignerSmartFields,
  pickSecondSigner,
} from '@/lib/agreementSmartFields';

const primary = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  phone: '555-0100',
};

const secondary = {
  enabled: true,
  firstName: 'Bob',
  lastName: 'Jones',
  email: 'bob@example.com',
  phone: '555-0200',
};

describe('applySignerSmartFields', () => {
  it('returns empty/falsy html unchanged', () => {
    expect(applySignerSmartFields('', primary, null)).toBe('');
  });

  it('renders primary-only values when no second signer', () => {
    const html =
      '{{client.firstName}} {{client.lastName}}|{{client.fullName}}|{{clients.fullNames}}|{{client.email}}|{{secondSigner.firstName}}';
    const out = applySignerSmartFields(html, primary, null);
    expect(out).toBe('Alice Smith|Alice Smith|Alice Smith|alice@example.com|');
  });

  it('expands combined first+last to both full names', () => {
    const out = applySignerSmartFields(
      '{{client.firstName}} {{client.lastName}}',
      primary,
      secondary,
    );
    expect(out).toBe('Alice Smith and Bob Jones');
  });

  it('expands lone firstName / lastName tokens', () => {
    expect(applySignerSmartFields('{{client.firstName}}', primary, secondary)).toBe(
      'Alice and Bob',
    );
    expect(applySignerSmartFields('{{client.lastName}}', primary, secondary)).toBe(
      'Smith and Jones',
    );
  });

  it('keeps email/phone as primary-only even with second signer', () => {
    const out = applySignerSmartFields(
      '{{client.email}}|{{client.phone}}',
      primary,
      secondary,
    );
    expect(out).toBe('alice@example.com|555-0100');
  });

  it('renders aggregate clients.* tokens', () => {
    const html = '{{clients.fullNames}}|{{clients.firstNames}}|{{clients.lastNames}}';
    expect(applySignerSmartFields(html, primary, secondary)).toBe(
      'Alice Smith and Bob Jones|Alice and Bob|Smith and Jones',
    );
    expect(applySignerSmartFields(html, primary, null)).toBe('Alice Smith|Alice|Smith');
  });

  it('renders explicit secondSigner.* tokens', () => {
    const html =
      '{{secondSigner.firstName}}|{{secondSigner.lastName}}|{{secondSigner.fullName}}|{{secondSigner.email}}|{{secondSigner.phone}}';
    expect(applySignerSmartFields(html, primary, secondary)).toBe(
      'Bob|Jones|Bob Jones|bob@example.com|555-0200',
    );
    expect(applySignerSmartFields(html, primary, { enabled: false })).toBe('||||');
  });

  it('tolerates whitespace inside tokens', () => {
    expect(applySignerSmartFields('{{ client.firstName }}', primary, null)).toBe('Alice');
  });

  it('HTML-escapes by default', () => {
    const dirty = { firstName: '<b>A</b>', lastName: 'O\'Brien & Co', email: 'a"b@c.com' };
    const out = applySignerSmartFields(
      '{{client.fullName}}|{{client.email}}',
      dirty,
      null,
    );
    expect(out).toContain('&lt;b&gt;A&lt;/b&gt;');
    expect(out).toContain('&amp;');
    expect(out).toContain('&#039;');
    expect(out).toContain('&quot;');
  });

  it('can disable escaping', () => {
    const dirty = { firstName: '<b>A</b>', lastName: 'B' };
    const out = applySignerSmartFields('{{client.fullName}}', dirty, null, {
      escapeValues: false,
    });
    expect(out).toBe('<b>A</b> B');
  });

  it('ignores secondary when enabled is false', () => {
    const out = applySignerSmartFields('{{client.firstName}}', primary, {
      ...secondary,
      enabled: false,
    });
    expect(out).toBe('Alice');
  });

  it('handles missing primary gracefully', () => {
    expect(applySignerSmartFields('{{client.firstName}}|{{client.email}}', null, null)).toBe(
      '|',
    );
  });
});

describe('pickSecondSigner', () => {
  it('returns null when agreement missing or not enabled', () => {
    expect(pickSecondSigner(null)).toBeNull();
    expect(pickSecondSigner({ secondSignerEnabled: false })).toBeNull();
    expect(pickSecondSigner({})).toBeNull();
  });

  it('reads flat Prisma-style fields', () => {
    expect(
      pickSecondSigner({
        secondSignerEnabled: true,
        secondSignerFirstName: 'Bob',
        secondSignerLastName: 'Jones',
        secondSignerEmail: 'bob@example.com',
        secondSignerPhone: '555',
      }),
    ).toEqual({
      enabled: true,
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
      phone: '555',
    });
  });

  it('prefers nested secondSigner object when present', () => {
    expect(
      pickSecondSigner({
        secondSignerEnabled: true,
        secondSignerFirstName: 'Flat',
        secondSigner: {
          firstName: 'Nested',
          lastName: 'Person',
          email: 'n@example.com',
          phone: '1',
        },
      }),
    ).toEqual({
      enabled: true,
      firstName: 'Nested',
      lastName: 'Person',
      email: 'n@example.com',
      phone: '1',
    });
  });
});
