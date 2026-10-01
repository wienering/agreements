import { describe, expect, it } from 'vitest';
import { escapeHtml } from '@/lib/htmlEscape';
import { sanitizeAgreementHtml } from '@/lib/sanitizeHtml';

describe('escapeHtml', () => {
  it('escapes &, <, >, ", and \'', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#039;');
  });

  it('handles nullish by coercing to empty string', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });
});

describe('sanitizeAgreementHtml', () => {
  it('returns empty/falsy input unchanged', () => {
    expect(sanitizeAgreementHtml('')).toBe('');
  });

  it('strips script tags', () => {
    const out = sanitizeAgreementHtml('<p>Hi</p><script>alert(1)</script>');
    expect(out).toContain('<p>Hi</p>');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('strips event handler attributes', () => {
    const out = sanitizeAgreementHtml('<p onclick="evil()">Click</p><img src="x" onerror="evil()">');
    expect(out.toLowerCase()).not.toContain('onclick');
    expect(out.toLowerCase()).not.toContain('onerror');
    expect(out).not.toContain('evil()');
  });

  it('strips javascript: URLs from href', () => {
    const out = sanitizeAgreementHtml('<a href="javascript:alert(1)">link</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('strips javascript: URLs from src', () => {
    const out = sanitizeAgreementHtml('<img src="javascript:alert(1)">');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('keeps safe formatting tags and http(s) links', () => {
    const out = sanitizeAgreementHtml(
      '<p><strong>Bold</strong></p><a href="https://example.com">ok</a>',
    );
    expect(out).toContain('<strong>Bold</strong>');
    expect(out).toContain('href="https://example.com"');
  });
});
