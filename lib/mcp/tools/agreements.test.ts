import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { assertNoForbiddenFields } from '@/lib/mcp/tools/sanitize';
import { mcpEndTime } from '@/lib/mcp/tools/datetime';

const prismaMock = vi.hoisted(() => ({
  agreement: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/mcp/db', () => ({
  getMcpPrisma: () => prismaMock,
}));

import { getAgreement, searchAgreements } from '@/lib/mcp/tools/agreements';

describe('mcp agreement tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('search_agreements returns calendar eventDate, startTime, duration, and attendant names', async () => {
    prismaMock.agreement.findMany.mockResolvedValue([
      {
        id: 'a1',
        status: 'SENT',
        paymentStatus: 'Not paid',
        client: {
          firstName: 'Samreen',
          lastName: 'Khan',
          email: 'samreen@example.com',
          eventDate: new Date('2026-12-01T05:00:00.000Z'),
          eventLocation: 'Legacy hall',
          eventStartTime: '9:00 am',
          eventDuration: '2 hours',
          packagePrice: new Prisma.Decimal('900.00'),
        },
        event: {
          eventDate: new Date('2026-12-01T05:00:00.000Z'),
          eventLocation: 'The Conservatory',
          eventName: 'Wedding',
          eventStartTime: '8:30 pm',
          eventDuration: '4 hours',
          packagePrice: new Prisma.Decimal('1500.00'),
        },
        backdropLink: {
          attendant: { name: 'Alex Rivera' },
        },
      },
    ]);

    const results = await searchAgreements({ query: 'Samreen' });
    expect(results).toEqual([
      {
        id: 'a1',
        clientName: 'Samreen Khan',
        eventDate: '2026-12-01',
        startTime: '8:30 pm',
        duration: '4 hours',
        endTime: '12:30 am',
        packagePrice: 1500,
        venue: 'The Conservatory',
        status: 'SENT',
        paymentStatus: 'Not paid',
        attendants: ['Alex Rivera'],
      },
    ]);
    assertNoForbiddenFields(results);
  });

  it('get_agreement uses calendar eventDate and offset ISO only for true timestamps', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue({
      id: 'a1',
      status: 'SIGNED',
      paymentStatus: 'Paid',
      expiresAt: new Date('2026-11-23T13:30:00.000Z'),
      signedAt: new Date('2026-11-20T18:00:00.000Z'),
      nextAction: null,
      archived: false,
      selectedBackdropName: 'Garden',
      client: {
        id: 'c1',
        firstName: 'Samreen',
        lastName: 'Khan',
        email: 'samreen@example.com',
        phone: '555',
        eventDate: null,
        eventLocation: null,
        eventStartTime: null,
        eventDuration: null,
        notes: null,
      },
      event: {
        id: 'e1',
        eventDate: new Date('2026-12-01T05:00:00.000Z'),
        eventLocation: 'The Conservatory',
        eventStartTime: '8:30 pm',
        eventDuration: '4 hours',
        eventPackage: 'Gold',
        packagePrice: new Prisma.Decimal('1500.00'),
        eventName: 'Wedding',
        notes: null,
      },
      template: {
        id: 't1',
        title: 'Standard',
        internalTitle: 'std',
      },
      backdropLink: {
        attendant: { name: 'Jordan Lee' },
      },
    });

    const agreement = await getAgreement('a1');
    expect(agreement?.event).toMatchObject({
      eventDate: '2026-12-01',
      startTime: '8:30 pm',
      duration: '4 hours',
      endTime: '12:30 am',
      packagePrice: 1500,
    });
    expect(agreement?.attendants).toEqual(['Jordan Lee']);
    expect(agreement?.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(agreement?.signedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(prismaMock.agreement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          backdropLink: {
            select: { attendant: { select: { name: true } } },
          },
        }),
      }),
    );
    assertNoForbiddenFields(agreement);
  });

  it('omits attendant contact fields and returns empty attendants when unassigned', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue({
      id: 'a2',
      status: 'DRAFT',
      paymentStatus: 'Not paid',
      expiresAt: null,
      signedAt: null,
      nextAction: null,
      archived: false,
      selectedBackdropName: null,
      client: {
        id: 'c1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: null,
        eventDate: new Date('2026-06-15T04:00:00.000Z'),
        eventLocation: 'Hall',
        eventStartTime: '10:00 am',
        eventDuration: '3 hours',
        packagePrice: null,
        notes: null,
      },
      event: null,
      template: { id: 't1', title: 'Standard', internalTitle: 'std' },
      backdropLink: null,
    });

    const agreement = await getAgreement('a2');
    expect(agreement?.attendants).toEqual([]);
    expect(agreement?.event).toEqual({
      eventDate: '2026-06-15',
      venue: 'Hall',
      startTime: '10:00 am',
      duration: '3 hours',
      endTime: '1:00 pm',
      packagePrice: null,
    });
  });
});

describe('mcpEndTime', () => {
  it.each([
    ['4:00 PM', '3 hours', '7:00 pm'],
    ['16:00', '2.5 hrs', '6:30 pm'],
    ['11:30 am', '90 minutes', '1:00 pm'],
    ['8:30 pm', '4 hours', '12:30 am'],
    ['6pm', '1 hour 30 min', '7:30 pm'],
  ])('%s + %s -> %s', (start, duration, expected) => {
    expect(mcpEndTime(start, duration)).toBe(expected);
  });

  it('returns null when start or duration cannot be parsed', () => {
    expect(mcpEndTime(null, '3 hours')).toBeNull();
    expect(mcpEndTime('evening', '3 hours')).toBeNull();
    expect(mcpEndTime('4:00 pm', 'all night')).toBeNull();
  });
});
