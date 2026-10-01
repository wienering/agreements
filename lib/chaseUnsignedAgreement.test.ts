import { describe, expect, it } from 'vitest';
import {
  filterDueChaseAgreements,
  isAcceleratedCadence,
  isDueForReminder,
  resolveReminderRecipient,
  type ChaseAgreement,
} from '@/lib/chaseUnsignedAgreement';

function makeAgreement(overrides: Partial<ChaseAgreement> = {}): ChaseAgreement {
  const base = {
    id: 'agr-1',
    clientId: 'cli-1',
    templateId: 'tpl-1',
    uniqueToken: 'tok',
    status: 'SENT',
    archived: false,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
    expiresAt: null,
    signedAt: null,
    lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
    lastReminderAt: null,
    reminderCount: 0,
    chaserPaused: false,
    nextAction: null,
    customHtmlContent: null,
    mergedHtml: null,
    secondSignerEnabled: false,
    secondSignerFirstName: null,
    secondSignerLastName: null,
    secondSignerEmail: null,
    secondSignerPhone: null,
    requireBothSignatures: false,
    eventId: null,
    client: {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      eventDate: null,
      emailGreetingName: null,
    },
    event: {
      eventDate: new Date('2026-04-15T16:00:00Z'),
    },
    signatures: [],
  };

  return { ...base, ...overrides } as ChaseAgreement;
}

describe('isAcceleratedCadence', () => {
  it('is true when event is 1–10 Toronto days away', () => {
    const now = new Date('2026-04-01T16:00:00Z');
    expect(isAcceleratedCadence(new Date('2026-04-05T16:00:00Z'), now)).toBe(true);
    expect(isAcceleratedCadence(new Date('2026-04-11T16:00:00Z'), now)).toBe(true);
  });

  it('is false when event is more than 10 days away, today, past, or null', () => {
    const now = new Date('2026-04-01T16:00:00Z');
    expect(isAcceleratedCadence(new Date('2026-04-12T16:00:00Z'), now)).toBe(false);
    expect(isAcceleratedCadence(new Date('2026-04-01T16:00:00Z'), now)).toBe(false);
    expect(isAcceleratedCadence(new Date('2026-03-20T16:00:00Z'), now)).toBe(false);
    expect(isAcceleratedCadence(null, now)).toBe(false);
  });
});

describe('isDueForReminder', () => {
  const farEvent = new Date('2026-06-01T16:00:00Z');

  it('returns false when never emailed', () => {
    const agr = makeAgreement({ lastEmailedAt: null, event: { eventDate: farEvent } });
    expect(isDueForReminder(agr, new Date('2026-03-10T12:00:00Z'))).toBe(false);
  });

  it('normal cadence: reminder 1 after 3 calendar days', () => {
    const lastEmailedAt = new Date('2026-03-01T12:00:00Z');
    const agr = makeAgreement({
      reminderCount: 0,
      lastEmailedAt,
      event: { eventDate: farEvent },
    });
    expect(isDueForReminder(agr, new Date('2026-03-03T12:00:00Z'))).toBe(false);
    expect(isDueForReminder(agr, new Date('2026-03-04T12:00:00Z'))).toBe(true);
  });

  it('accelerated cadence: reminder 1 after 1 calendar day', () => {
    const now = new Date('2026-03-31T16:00:00Z');
    const nearEvent = new Date('2026-04-05T16:00:00Z');
    const agr = makeAgreement({
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-30T16:00:00Z'),
      event: { eventDate: nearEvent },
    });
    expect(isDueForReminder(agr, now)).toBe(true);
  });

  it('normal cadence: reminder 2 after 4 days from max(lastReminderAt, lastEmailedAt)', () => {
    const agr = makeAgreement({
      reminderCount: 1,
      lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
      lastReminderAt: new Date('2026-03-05T12:00:00Z'),
      event: { eventDate: farEvent },
    });
    expect(isDueForReminder(agr, new Date('2026-03-08T12:00:00Z'))).toBe(false);
    expect(isDueForReminder(agr, new Date('2026-03-09T12:00:00Z'))).toBe(true);
  });

  it('accelerated cadence: reminder 2 after 2 days from anchor', () => {
    const nearEvent = new Date('2026-04-08T16:00:00Z');
    const agr = makeAgreement({
      reminderCount: 1,
      lastEmailedAt: new Date('2026-03-30T16:00:00Z'),
      lastReminderAt: new Date('2026-04-01T16:00:00Z'),
      event: { eventDate: nearEvent },
    });
    expect(isDueForReminder(agr, new Date('2026-04-02T16:00:00Z'))).toBe(false);
    expect(isDueForReminder(agr, new Date('2026-04-03T16:00:00Z'))).toBe(true);
  });

  it('returns false when reminderCount >= 2', () => {
    const agr = makeAgreement({
      reminderCount: 2,
      lastEmailedAt: new Date('2026-01-01T12:00:00Z'),
      event: { eventDate: farEvent },
    });
    expect(isDueForReminder(agr, new Date('2026-03-01T12:00:00Z'))).toBe(false);
  });

  it('reminder 2 returns false when no anchor timestamps', () => {
    const agr = makeAgreement({
      reminderCount: 1,
      lastEmailedAt: null,
      lastReminderAt: null,
      event: { eventDate: farEvent },
    });
    // lastEmailedAt null short-circuits first
    expect(isDueForReminder(agr, new Date('2026-03-10T12:00:00Z'))).toBe(false);
  });
});

describe('resolveReminderRecipient', () => {
  it('returns client when primary has not signed (no second signer)', () => {
    const agr = makeAgreement();
    expect(resolveReminderRecipient(agr)).toEqual({
      to: 'alice@example.com',
      cc: [],
      recipient: 'client',
      greetingFirstName: 'Alice',
    });
  });

  it('uses emailGreetingName when set', () => {
    const agr = makeAgreement({
      client: {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        eventDate: null,
        emailGreetingName: 'Al',
      },
    });
    expect(resolveReminderRecipient(agr)?.greetingFirstName).toBe('Al');
  });

  it('returns null when primary already signed (no requireBoth)', () => {
    const agr = makeAgreement({
      signatures: [{ signerEmail: 'alice@example.com' }],
    });
    expect(resolveReminderRecipient(agr)).toBeNull();
  });

  it('CCs second signer when enabled and different email', () => {
    const agr = makeAgreement({
      secondSignerEnabled: true,
      secondSignerEmail: 'bob@example.com',
      secondSignerFirstName: 'Bob',
    });
    expect(resolveReminderRecipient(agr)).toEqual({
      to: 'alice@example.com',
      cc: ['bob@example.com'],
      recipient: 'client',
      greetingFirstName: 'Alice',
    });
  });

  it('does not CC when second signer email matches client', () => {
    const agr = makeAgreement({
      secondSignerEnabled: true,
      secondSignerEmail: 'Alice@example.com',
    });
    expect(resolveReminderRecipient(agr)?.cc).toEqual([]);
  });

  it('requireBoth: both unsigned → client + cc', () => {
    const agr = makeAgreement({
      secondSignerEnabled: true,
      requireBothSignatures: true,
      secondSignerEmail: 'bob@example.com',
      secondSignerFirstName: 'Bob',
    });
    expect(resolveReminderRecipient(agr)).toEqual({
      to: 'alice@example.com',
      cc: ['bob@example.com'],
      recipient: 'client',
      greetingFirstName: 'Alice',
    });
  });

  it('requireBoth: only primary signed → second signer', () => {
    const agr = makeAgreement({
      secondSignerEnabled: true,
      requireBothSignatures: true,
      secondSignerEmail: 'bob@example.com',
      secondSignerFirstName: 'Bob',
      signatures: [{ signerEmail: 'alice@example.com' }],
    });
    expect(resolveReminderRecipient(agr)).toEqual({
      to: 'bob@example.com',
      recipient: 'secondSigner',
      greetingFirstName: 'Bob',
    });
  });

  it('requireBoth: only secondary signed → client (no cc)', () => {
    const agr = makeAgreement({
      secondSignerEnabled: true,
      requireBothSignatures: true,
      secondSignerEmail: 'bob@example.com',
      secondSignerFirstName: 'Bob',
      signatures: [{ signerEmail: 'bob@example.com' }],
    });
    expect(resolveReminderRecipient(agr)).toEqual({
      to: 'alice@example.com',
      recipient: 'client',
      greetingFirstName: 'Alice',
    });
  });

  it('requireBoth: both signed → null', () => {
    const agr = makeAgreement({
      secondSignerEnabled: true,
      requireBothSignatures: true,
      secondSignerEmail: 'bob@example.com',
      signatures: [
        { signerEmail: 'alice@example.com' },
        { signerEmail: 'bob@example.com' },
      ],
    });
    expect(resolveReminderRecipient(agr)).toBeNull();
  });

  it('falls back greeting to "there" when first name empty', () => {
    const agr = makeAgreement({
      client: {
        firstName: '',
        lastName: 'Smith',
        email: 'alice@example.com',
        eventDate: null,
        emailGreetingName: null,
      },
    });
    expect(resolveReminderRecipient(agr)?.greetingFirstName).toBe('there');
  });
});

describe('filterDueChaseAgreements', () => {
  const now = new Date('2026-03-10T16:00:00Z');

  it('keeps agreements that are future, due, and have a recipient', () => {
    const due = makeAgreement({
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
      event: { eventDate: new Date('2026-04-15T16:00:00Z') },
    });
    const result = filterDueChaseAgreements([due], now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('agr-1');
  });

  it('excludes past/today events', () => {
    const past = makeAgreement({
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
      event: { eventDate: new Date('2026-03-09T16:00:00Z') },
    });
    const today = makeAgreement({
      id: 'agr-today',
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
      event: { eventDate: new Date('2026-03-10T16:00:00Z') },
    });
    expect(filterDueChaseAgreements([past, today], now)).toHaveLength(0);
  });

  it('excludes when not due yet', () => {
    const notDue = makeAgreement({
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-09T12:00:00Z'),
      event: { eventDate: new Date('2026-04-15T16:00:00Z') },
    });
    expect(filterDueChaseAgreements([notDue], now)).toHaveLength(0);
  });

  it('excludes when recipient resolves to null (already signed)', () => {
    const signed = makeAgreement({
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
      event: { eventDate: new Date('2026-04-15T16:00:00Z') },
      signatures: [{ signerEmail: 'alice@example.com' }],
    });
    expect(filterDueChaseAgreements([signed], now)).toHaveLength(0);
  });

  it('falls back to client.eventDate when event is null', () => {
    const agr = makeAgreement({
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
      event: null,
      client: {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        eventDate: new Date('2026-04-15T16:00:00Z'),
        emailGreetingName: null,
      },
    });
    expect(filterDueChaseAgreements([agr], now)).toHaveLength(1);
  });

  it('excludes when no event date at all', () => {
    const agr = makeAgreement({
      reminderCount: 0,
      lastEmailedAt: new Date('2026-03-01T12:00:00Z'),
      event: null,
      client: {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        eventDate: null,
        emailGreetingName: null,
      },
    });
    expect(filterDueChaseAgreements([agr], now)).toHaveLength(0);
  });
});
