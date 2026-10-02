import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  prisma: {
    agreement: { findMany: vi.fn() },
    client: { update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/requireAdmin', () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
  adminAuthResponse: vi.fn(() => null),
}));

import { PUT } from '@/app/api/clients/update/route';

function request(): NextRequest {
  return {
    json: async () => ({ id: 'client_1', firstName: 'Dennis', lastName: 'Larkin', email: 'd@example.com' }),
  } as unknown as NextRequest;
}

describe('client edit lock', () => {
  it('locks only on SIGNED agreements, so COMPLETED clients stay editable', async () => {
    mocks.prisma.agreement.findMany.mockResolvedValue([{ id: 'agr_1', uniqueToken: 'tok' }]);

    const response = await PUT(request());

    expect(mocks.prisma.agreement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client_1', status: 'SIGNED' } }),
    );
    expect(response.status).toBe(403);
    expect(mocks.prisma.client.update).not.toHaveBeenCalled();
  });
});
