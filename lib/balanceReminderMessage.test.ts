import { describe, expect, it } from 'vitest';
import { addTorontoCalendarDaysFrom, formatEventDateToronto, torontoDateKey } from '@/lib/dates';
import { buildBalanceReminderDraft } from '@/lib/balanceReminderMessage';

const EVENT = new Date('2026-10-17T16:00:00.000Z');

describe('buildBalanceReminderDraft', () => {
  it('fills the name, event date, due date, and payment link', () => {
    const due = addTorontoCalendarDaysFrom(EVENT, -7);
    expect(torontoDateKey(EVENT)).toBe('2026-10-17');
    expect(torontoDateKey(due)).toBe('2026-10-10');

    const draft = buildBalanceReminderDraft({
      firstName: 'Sam',
      eventDate: EVENT,
      stripePaymentLink: 'https://buy.stripe.com/test',
    });

    expect(draft.subject).toBe(
      `Balance reminder for your photo booth on ${formatEventDateToronto(EVENT)}`,
    );
    expect(draft.message).toBe(
      [
        'Hi Sam,',
        '',
        `Just a reminder that the balance for your photo booth on ${formatEventDateToronto(EVENT)} is due by ${formatEventDateToronto(due)}. You can pay here: https://buy.stripe.com/test. You can also e-transfer to info@photoboothguys.ca.`,
        '',
        "If you've already sent it, thank you, and please ignore this email.",
        '',
        'Dennis',
        'Photobooth Guys',
        '647-378-5332',
      ].join('\n'),
    );
  });

  it('leaves out the greeting, the date sentence, and the payment link when that data is missing', () => {
    const draft = buildBalanceReminderDraft({
      firstName: '   ',
      eventDate: null,
      stripePaymentLink: ' ',
    });

    expect(draft.message.startsWith('Hi ')).toBe(false);
    expect(draft.message).not.toContain('Just a reminder');
    expect(draft.message).not.toContain('You can pay here');
    expect(draft.message).toContain('You can also e-transfer to info@photoboothguys.ca.');
    expect(draft.message).toContain('Dennis');
    expect(draft.subject).toBe('Balance reminder for your photo booth');
  });

  it('keeps the date sentence when only the payment link is missing', () => {
    const draft = buildBalanceReminderDraft({
      firstName: 'Sam',
      eventDate: EVENT,
      stripePaymentLink: null,
    });

    expect(draft.message).toContain(`Hi Sam,`);
    expect(draft.message).toContain('Just a reminder');
    expect(draft.message).not.toContain('You can pay here');
    expect(draft.message).toContain('You can also e-transfer to info@photoboothguys.ca.');
  });
});
