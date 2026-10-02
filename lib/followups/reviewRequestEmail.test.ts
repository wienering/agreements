import { describe, expect, it } from 'vitest';
import { buildReviewRequestEmail } from '@/lib/followups/reviewRequestEmail';
import { GOOGLE_REVIEW_URL_ONTARIO } from '@/lib/followups/rules';

describe('buildReviewRequestEmail', () => {
  const email = buildReviewRequestEmail({ firstName: 'Jane', emailGreetingName: 'Jane and Sam' }, GOOGLE_REVIEW_URL_ONTARIO);

  it('uses the agreed subject and copy, word for word', () => {
    expect(email.subject).toBe('A quick favour');
    expect(email.text).toBe(
      [
        'Hi Jane and Sam,',
        '',
        "Hope you've had a chance to go through the photos from your event. If you have a minute, a short Google review would mean a lot to us. It's how most people find us.",
        '',
        GOOGLE_REVIEW_URL_ONTARIO,
        '',
        'Thanks again for having us.',
        'Dennis',
      ].join('\n'),
    );
  });

  it('puts the same copy and the review link in the HTML', () => {
    expect(email.html).toContain('Hi Jane and Sam,');
    expect(email.html).toContain("It's how most people find us.");
    expect(email.html).toContain(`href="${GOOGLE_REVIEW_URL_ONTARIO}"`);
    expect(email.html).toContain('Thanks again for having us.');
  });

  it('falls back to the first name and escapes it', () => {
    const plain = buildReviewRequestEmail({ firstName: '<Jo>', emailGreetingName: null }, GOOGLE_REVIEW_URL_ONTARIO);
    expect(plain.text.startsWith('Hi <Jo>,')).toBe(true);
    expect(plain.html).toContain('Hi &lt;Jo&gt;,');
  });

  it('has no em dashes anywhere', () => {
    expect(email.text).not.toContain('—');
    expect(email.subject).not.toContain('—');
    const body = email.html.slice(email.html.indexOf('Hi Jane'), email.html.indexOf('Dennis</p>'));
    expect(body).not.toContain('—');
  });
});
