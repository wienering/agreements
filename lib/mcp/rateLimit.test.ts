import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  mcpAuthAttemptLog: {
    create: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  },
  mcpOAuthGrant: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('@/lib/mcp/db', () => ({
  getMcpPrisma: () => prismaMock,
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage: vi.fn(),
}));

import {
  consumeGrantRateLimit,
  deleteOldMcpAuthAttemptLogs,
  isMcpUnauthIpRateLimited,
} from '@/lib/mcp/rateLimit';

describe('mcp rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('limits MCP unauth IP traffic based on failed attempts only', async () => {
    prismaMock.mcpAuthAttemptLog.count.mockResolvedValue(20);
    expect(await isMcpUnauthIpRateLimited('1.2.3.4')).toBe(true);
    expect(prismaMock.mcpAuthAttemptLog.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ kind: 'mcp', success: false }),
      }),
    );
  });

  it('resets the grant window when expired', async () => {
    prismaMock.mcpOAuthGrant.findUnique.mockResolvedValue({
      rateLimitCount: 300,
      rateLimitWindowStart: new Date(Date.now() - 16 * 60 * 1000),
      revokedAt: null,
    });
    prismaMock.mcpOAuthGrant.update.mockResolvedValue({});

    expect(await consumeGrantRateLimit('grant_1')).toBe(true);
    expect(prismaMock.mcpOAuthGrant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rateLimitCount: 1 }),
      }),
    );
  });

  it('blocks when the grant is over the window limit', async () => {
    prismaMock.mcpOAuthGrant.findUnique.mockResolvedValue({
      rateLimitCount: 300,
      rateLimitWindowStart: new Date(),
      revokedAt: null,
    });

    expect(await consumeGrantRateLimit('grant_1')).toBe(false);
    expect(prismaMock.mcpOAuthGrant.updateMany).not.toHaveBeenCalled();
  });

  it('deletes attempt logs older than seven days', async () => {
    prismaMock.mcpAuthAttemptLog.deleteMany.mockResolvedValue({ count: 12 });
    expect(await deleteOldMcpAuthAttemptLogs(7)).toBe(12);
    expect(prismaMock.mcpAuthAttemptLog.deleteMany).toHaveBeenCalled();
  });
});
