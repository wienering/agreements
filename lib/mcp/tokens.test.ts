import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

type Tx = {
  mcpAuthCode: {
    updateMany: ReturnType<typeof vi.fn>;
  };
  mcpRefreshToken: {
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  mcpAccessToken: {
    create: ReturnType<typeof vi.fn>;
  };
  mcpOAuthGrant: {
    update: ReturnType<typeof vi.fn>;
  };
};

const prismaMock = vi.hoisted(() => ({
  mcpOAuthGrant: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  mcpAuthCode: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  mcpAccessToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  mcpRefreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/mcp/db', () => ({
  getMcpPrisma: () => prismaMock,
}));

import {
  createAuthorizationCode,
  exchangeAuthorizationCode,
  rotateRefreshToken,
  verifyAccessToken,
} from '@/lib/mcp/tokens';
import { pkceS256Challenge, sha256Hex } from '@/lib/mcp/crypto';

function hash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function authCodeRow(overrides: Record<string, unknown> = {}) {
  const code = 'auth-code-value';
  return {
    id: 'code_1',
    grantId: 'grant_1',
    codeHash: sha256Hex(code),
    redirectUri: 'https://claude.ai/api/mcp/auth_callback',
    codeChallenge: pkceS256Challenge('verifier-aaaaaaaaaaaaaaaaaaaa'),
    codeChallengeMethod: 'S256',
    expiresAt: new Date(Date.now() + 30_000),
    usedAt: null,
    grant: { id: 'grant_1', clientId: 'claude', revokedAt: null, scopes: ['read'] },
    ...overrides,
  };
}

function refreshRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rt_1',
    grantId: 'grant_1',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedById: null,
    grant: { clientId: 'claude', revokedAt: null, scopes: ['read'] },
    ...overrides,
  };
}

describe('mcp tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops);
      }
      if (typeof ops === 'function') {
        const tx: Tx = {
          mcpAuthCode: { updateMany: prismaMock.mcpAuthCode.updateMany },
          mcpRefreshToken: {
            updateMany: prismaMock.mcpRefreshToken.updateMany,
            create: prismaMock.mcpRefreshToken.create,
            update: prismaMock.mcpRefreshToken.update,
          },
          mcpAccessToken: { create: prismaMock.mcpAccessToken.create },
          mcpOAuthGrant: { update: prismaMock.mcpOAuthGrant.update },
        };
        return ops(tx);
      }
      return ops;
    });
  });

  it('stores only the hash of a new auth code', async () => {
    prismaMock.mcpOAuthGrant.create.mockImplementation(async (args: { data: { authCodes: { create: { codeHash: string } } } }) => {
      expect(args.data.authCodes.create.codeHash).toMatch(/^[a-f0-9]{64}$/);
      return { id: 'grant_1' };
    });

    const result = await createAuthorizationCode({
      clientId: 'claude',
      userEmail: 'admin@example.com',
      scopes: ['read'],
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: 'challenge',
      codeChallengeMethod: 'S256',
    });

    expect(result.grantId).toBe('grant_1');
    expect(result.code.length).toBeGreaterThan(20);
  });

  it('rejects a wrong PKCE verifier', async () => {
    const code = 'auth-code-value';
    prismaMock.mcpAuthCode.findUnique.mockResolvedValue({
      ...authCodeRow({
        codeHash: sha256Hex(code),
        codeChallenge: pkceS256Challenge('correct-verifier-aaaaaaaaaaaa'),
      }),
    });

    const result = await exchangeAuthorizationCode({
      code,
      clientId: 'claude',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeVerifier: 'wrong-verifier-bbbbbbbbbbbbbb',
    });

    expect(result).toEqual({ error: 'invalid_grant' });
    expect(prismaMock.mcpAuthCode.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a reused auth code and revokes the grant', async () => {
    const code = 'used-code';
    prismaMock.mcpAuthCode.findUnique.mockResolvedValue(
      authCodeRow({
        codeHash: hash(code),
        usedAt: new Date(),
        codeChallenge: pkceS256Challenge('verifier-cccccccccccccccc'),
      }),
    );

    const result = await exchangeAuthorizationCode({
      code,
      clientId: 'claude',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeVerifier: 'verifier-cccccccccccccccc',
    });

    expect(result).toEqual({ error: 'invalid_grant' });
    expect(prismaMock.mcpOAuthGrant.update).toHaveBeenCalled();
  });

  it('rejects an expired auth code', async () => {
    const code = 'expired-code';
    prismaMock.mcpAuthCode.findUnique.mockResolvedValue(
      authCodeRow({
        codeHash: hash(code),
        expiresAt: new Date(Date.now() - 1_000),
        codeChallenge: pkceS256Challenge('verifier-dddddddddddddddd'),
      }),
    );

    const result = await exchangeAuthorizationCode({
      code,
      clientId: 'claude',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeVerifier: 'verifier-dddddddddddddddd',
    });

    expect(result).toEqual({ error: 'invalid_grant' });
  });

  it('rejects an expired access token', async () => {
    prismaMock.mcpAccessToken.findUnique.mockResolvedValue({
      id: 'tok_1',
      grantId: 'grant_1',
      expiresAt: new Date(Date.now() - 1_000),
      revokedAt: null,
      grant: { clientId: 'claude', userEmail: 'a@b.c', scopes: ['read'], revokedAt: null },
    });

    expect(await verifyAccessToken('access-token')).toBeNull();
  });

  it('rejects a revoked grant access token', async () => {
    prismaMock.mcpAccessToken.findUnique.mockResolvedValue({
      id: 'tok_1',
      grantId: 'grant_1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      grant: {
        clientId: 'claude',
        userEmail: 'a@b.c',
        scopes: ['read'],
        revokedAt: new Date(),
      },
    });

    expect(await verifyAccessToken('access-token')).toBeNull();
  });

  it('revokes the grant when a refresh token is reused', async () => {
    prismaMock.mcpRefreshToken.findUnique.mockResolvedValue(
      refreshRow({ revokedAt: new Date(), replacedById: 'rt_2' }),
    );

    const result = await rotateRefreshToken({
      refreshToken: 'old-refresh',
      clientId: 'claude',
    });

    expect(result).toEqual({ error: 'invalid_grant' });
    expect(prismaMock.mcpOAuthGrant.update).toHaveBeenCalled();
  });

  it('allows only one concurrent auth code exchange to succeed', async () => {
    let claimCount = 0;
    prismaMock.mcpAuthCode.findUnique.mockResolvedValue(authCodeRow());
    prismaMock.mcpAuthCode.updateMany.mockImplementation(async () => {
      claimCount += 1;
      return { count: claimCount === 1 ? 1 : 0 };
    });
    prismaMock.mcpAccessToken.create.mockResolvedValue({});
    prismaMock.mcpRefreshToken.create.mockResolvedValue({});
    prismaMock.mcpOAuthGrant.update.mockResolvedValue({});
    prismaMock.mcpAccessToken.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.mcpRefreshToken.updateMany.mockResolvedValue({ count: 0 });

    const args = {
      code: 'auth-code-value',
      clientId: 'claude',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeVerifier: 'verifier-aaaaaaaaaaaaaaaaaaaa',
    };

    const [first, second] = await Promise.all([
      exchangeAuthorizationCode(args),
      exchangeAuthorizationCode(args),
    ]);

    const successes = [first, second].filter((result) => !('error' in result));
    const failures = [first, second].filter((result) => 'error' in result);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual({ error: 'invalid_grant' });
  });

  it('allows only one concurrent refresh rotation to succeed', async () => {
    let claimCount = 0;
    prismaMock.mcpRefreshToken.findUnique.mockResolvedValue(refreshRow());
    prismaMock.mcpRefreshToken.updateMany.mockImplementation(async () => {
      claimCount += 1;
      return { count: claimCount === 1 ? 1 : 0 };
    });
    prismaMock.mcpRefreshToken.create.mockResolvedValue({ id: 'rt_new' });
    prismaMock.mcpRefreshToken.update.mockResolvedValue({});
    prismaMock.mcpAccessToken.create.mockResolvedValue({});
    prismaMock.mcpOAuthGrant.update.mockResolvedValue({});
    prismaMock.mcpAccessToken.updateMany.mockResolvedValue({ count: 0 });

    const args = { refreshToken: 'refresh-token-value', clientId: 'claude' };
    const [first, second] = await Promise.all([
      rotateRefreshToken(args),
      rotateRefreshToken(args),
    ]);

    const successes = [first, second].filter((result) => !('error' in result));
    const failures = [first, second].filter((result) => 'error' in result);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual({ error: 'invalid_grant' });
  });
});
