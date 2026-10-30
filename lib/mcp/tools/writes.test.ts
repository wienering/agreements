import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  agreement: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  event: {
    create: vi.fn(),
    update: vi.fn(),
  },
  template: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  clientNote: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  agreementActivity: {
    create: vi.fn(),
  },
  settings: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/mcp/db', () => ({
  getMcpPrisma: () => prismaMock,
}));

vi.mock('@/lib/activityLog', () => ({
  logAgreementActivity: vi.fn(),
}));

vi.mock('@/lib/attendants/conflictQuery', () => ({
  loadConflictAgreement: vi.fn().mockResolvedValue(null),
  loadUpcomingAssignedAgreements: vi.fn().mockResolvedValue([]),
  loadConflictBuffers: vi.fn().mockResolvedValue({
    setupMinutes: 0,
    teardownMinutes: 0,
    travelMinutes: 0,
  }),
}));

import { runWithMcpAuth } from '@/lib/mcp/authContext';
import type { VerifiedAccessToken } from '@/lib/mcp/tokens';
import {
  createClient,
  setPaymentStatus,
  updateAgreementDraft,
  updateClient,
} from '@/lib/mcp/tools/writes';
import { logAgreementActivity } from '@/lib/activityLog';

const readAuth: VerifiedAccessToken = {
  grantId: 'g1',
  tokenId: 't1',
  clientId: 'claude',
  userEmail: 'a@b.c',
  scopes: ['read'],
};

const writeAuth: VerifiedAccessToken = {
  ...readAuth,
  scopes: ['read', 'write'],
};

describe('mcp write tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects write tools without write scope', async () => {
    await expect(
      runWithMcpAuth(readAuth, () => updateClient('c1', { phone: '555' })),
    ).rejects.toMatchObject({ name: 'McpScopeError' });
  });

  it('updates only allowlisted client fields and flags signed document name', async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      id: 'c1',
      firstName: 'Sam',
      lastName: 'Old',
      email: 'sam@example.com',
      phone: null,
      emailGreetingName: null,
      address: null,
    });
    prismaMock.client.update.mockResolvedValue({
      id: 'c1',
      firstName: 'Samreen',
      lastName: 'Khan',
      email: 'sam@example.com',
      phone: '555',
      emailGreetingName: 'Sam',
      address: null,
    });
    prismaMock.agreement.findMany.mockResolvedValue([{ id: 'a1', status: 'SIGNED' }]);
    prismaMock.auditLog.create.mockResolvedValue({});

    const result = await runWithMcpAuth(writeAuth, () =>
      updateClient('c1', {
        name: 'Samreen Khan',
        phone: '555',
        emailGreetingName: 'Sam',
        company: 'Ignored Co',
      }),
    );

    expect(result).toMatchObject({
      signedDocumentStillShowsOriginalName: true,
      warnings: expect.arrayContaining([expect.stringMatching(/company/i)]),
    });
    expect(prismaMock.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ company: expect.anything() }),
      }),
    );
    expect(logAgreementActivity).toHaveBeenCalled();
  });

  it('returns likely duplicates instead of creating', async () => {
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: 'c1',
        firstName: 'Samreen',
        lastName: 'Khan',
        email: 'other@example.com',
        phone: null,
        emailGreetingName: null,
        address: null,
      },
    ]);

    const result = await runWithMcpAuth(writeAuth, () =>
      createClient({ name: 'Samreen Khan', email: 'new@example.com' }),
    );

    expect(result).toMatchObject({ created: false, reason: 'likely_duplicates' });
    expect(prismaMock.client.create).not.toHaveBeenCalled();
  });

  it('normalizes payment status and audits', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue({
      id: 'a1',
      paymentStatus: 'Not paid',
      status: 'SENT',
    });
    prismaMock.agreement.update.mockResolvedValue({});

    const result = await runWithMcpAuth(writeAuth, () => setPaymentStatus('a1', 'fully PAID'));
    expect(result).toMatchObject({
      before: { paymentStatus: 'Not paid' },
      after: { paymentStatus: 'Fully paid' },
    });
    expect(logAgreementActivity).toHaveBeenCalled();
  });

  it('refuses update_agreement_draft on signed agreements', async () => {
    prismaMock.agreement.findUnique.mockResolvedValue({
      id: 'a1',
      status: 'SIGNED',
      clientId: 'c1',
      eventId: 'e1',
      event: null,
      client: { id: 'c1', firstName: 'A', lastName: 'B' },
    });

    const result = await runWithMcpAuth(writeAuth, () =>
      updateAgreementDraft('a1', { venueName: 'Scotiabank Centre' }),
    );

    expect(result).toMatchObject({ error: expect.stringMatching(/draft/i) });
    expect(prismaMock.event.update).not.toHaveBeenCalled();
  });

  it('returns packagePrice and endTime in update_agreement_draft before/after', async () => {
    const summaryRow = (price: string, duration: string) => ({
      id: 'a1',
      status: 'DRAFT',
      paymentStatus: 'Not paid',
      expiresAt: null,
      signedAt: null,
      nextAction: null,
      archived: false,
      selectedBackdropName: null,
      client: {
        id: 'c1',
        firstName: 'A',
        lastName: 'B',
        email: 'a@example.com',
        phone: null,
        eventDate: null,
        eventLocation: null,
        eventStartTime: null,
        eventDuration: null,
        packagePrice: null,
        notes: null,
      },
      event: {
        id: 'e1',
        eventDate: null,
        eventLocation: null,
        eventStartTime: '6:00 pm',
        eventDuration: duration,
        eventPackage: 'Gold',
        packagePrice: new Prisma.Decimal(price),
        eventName: null,
        notes: null,
      },
      template: { id: 't1', title: 'Standard', internalTitle: 'std' },
      backdropLink: null,
    });

    prismaMock.agreement.findUnique
      .mockResolvedValueOnce({
        id: 'a1',
        status: 'DRAFT',
        clientId: 'c1',
        eventId: 'e1',
        event: { eventStartTime: '6:00 pm', eventDuration: '3 hours', eventName: null, eventLocation: null },
        client: { id: 'c1', firstName: 'A', lastName: 'B' },
      })
      .mockResolvedValueOnce(summaryRow('1200.00', '3 hours'))
      .mockResolvedValueOnce(summaryRow('1450.50', '4 hours'));
    prismaMock.event.update.mockResolvedValue({});

    const result = await runWithMcpAuth(writeAuth, () =>
      updateAgreementDraft('a1', { price: 1450.5, duration: '4 hours' }),
    );

    expect(result).toMatchObject({
      before: { event: { packagePrice: 1200, endTime: '9:00 pm' } },
      after: { event: { packagePrice: 1450.5, endTime: '10:00 pm' } },
    });
  });
});
