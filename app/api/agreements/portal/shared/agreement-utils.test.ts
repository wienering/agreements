import { describe, expect, it } from 'vitest';
import { processHtmlContent } from '@/app/api/agreements/portal/shared/agreement-utils';

const client = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  phone: '555-0100',
  address: '123 Main St',
  notes: 'VIP guest',
  eventDate: new Date('2026-06-15T16:00:00Z'),
  eventType: 'Wedding',
  eventLocation: 'Toronto',
  eventStartTime: '4:00 PM',
  eventDuration: '4 hours',
  eventPackage: 'Premium',
  packagePrice: 1200,
};

describe('processHtmlContent', () => {
  it('returns html unchanged when html or client is missing', () => {
    expect(processHtmlContent('', client, 'agr-1')).toBe('');
    expect(processHtmlContent('{{client.firstName}}', null, 'agr-1')).toBe('{{client.firstName}}');
  });

  it('replaces primary signer name tokens', () => {
    const html = '<p>{{client.firstName}} {{client.lastName}} — {{client.email}}</p>';
    const out = processHtmlContent(html, client, 'agr-1');
    expect(out).toContain('Alice Smith');
    expect(out).toContain('alice@example.com');
  });

  it('expands names when second signer is enabled', () => {
    const html = '{{client.firstName}} {{client.lastName}}';
    const out = processHtmlContent(html, client, 'agr-1', null, {
      enabled: true,
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
    });
    expect(out).toBe('Alice Smith and Bob Jones');
  });

  it('replaces explicit second-signer tokens', () => {
    const html = '{{secondSigner.firstName}}|{{secondSigner.email}}';
    const withSecond = processHtmlContent(html, client, 'agr-1', null, {
      enabled: true,
      firstName: 'Bob',
      email: 'bob@example.com',
    });
    expect(withSecond).toBe('Bob|bob@example.com');

    const withoutSecond = processHtmlContent(html, client, 'agr-1', null, null);
    expect(withoutSecond).toBe('|');
  });

  it('uses event fields when event is provided', () => {
    const event = {
      eventDate: new Date('2026-07-20T16:00:00Z'),
      eventType: 'Corporate',
      eventLocation: 'Ottawa Hall',
      eventStartTime: '6:00 PM',
      eventDuration: '2 hours',
      eventPackage: 'Standard',
      packagePrice: 800,
      notes: 'Event notes',
    };
    const html =
      '{{event.type}}|{{event.location}}|{{event.package}}|{{event.price}}|{{client.notes}}|{{client.address}}';
    const out = processHtmlContent(html, client, 'agr-1', event);
    expect(out).toBe('Corporate|Ottawa Hall|Standard|$800.00|Event notes|Ottawa Hall');
  });

  it('falls back to client event fields when event is null', () => {
    const html = '{{event.type}}|{{event.location}}|{{client.address}}|{{client.notes}}';
    const out = processHtmlContent(html, client, 'agr-1', null);
    expect(out).toBe('Wedding|Toronto|123 Main St|VIP guest');
  });

  it('replaces missing values with empty strings', () => {
    const sparse = { firstName: 'A', lastName: 'B', email: 'a@b.com' };
    const html =
      '{{client.address}}|{{client.notes}}|{{event.type}}|{{event.price}}|{{client.eventDate}}';
    const out = processHtmlContent(html, sparse, 'agr-1', null);
    expect(out).toBe('||||');
  });

  it('HTML-escapes substituted values by default', () => {
    const dirty = {
      ...client,
      firstName: '<script>x</script>',
      address: '"quoted"',
      notes: 'a & b',
    };
    const html = '{{client.firstName}}|{{client.address}}|{{client.notes}}';
    const out = processHtmlContent(html, dirty, 'agr-1');
    expect(out).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(out).toContain('&quot;quoted&quot;');
    expect(out).toContain('a &amp; b');
    expect(out).not.toContain('<script>');
  });

  it('can skip escaping when escapeValues is false', () => {
    const dirty = { ...client, firstName: '<b>Alice</b>' };
    const out = processHtmlContent('{{client.firstName}}', dirty, 'agr-1', null, null, {
      escapeValues: false,
    });
    expect(out).toBe('<b>Alice</b>');
  });

  it('replaces agreement.id', () => {
    const out = processHtmlContent('id={{agreement.id}}', client, 'agr-99');
    expect(out).toBe('id=agr-99');
  });

  it('formats package price with two decimals', () => {
    const out = processHtmlContent('{{event.price}}', { ...client, packagePrice: 99.5 }, 'agr-1');
    expect(out).toBe('$99.50');
  });

  // Bug: `packagePrice ? formatted : ''` treats 0 as missing, so a free package renders blank.
  it('formats a package price of 0 as $0.00', () => {    const out = processHtmlContent('{{event.price}}', { ...client, packagePrice: 0 }, 'agr-1');
    expect(out).toBe('$0.00');
  });
});
