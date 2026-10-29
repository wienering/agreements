import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

const prismaMock = vi.hoisted(() => ({
  mcpOAuthGrant: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  mcpAuthCode: {
    findUnique: vi.fn(),
    update: vi.fn(),
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
  $transaction: vi.fn(async (ops: unknown) => {
    if (Array.isArray(ops)) {
      return Promise.all(ops);
    }
    return ops;
  }),
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

describe('mcp tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      id: 'code_1',
      grantId: 'grant_1',
      codeHash: sha256Hex(code),
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: pkceS256Challenge('correct-verifier-aaaaaaaaaaaa'),
      codeChallengeMethod: 'S256',
      expiresAt: new Date(Date.now() + 30_000),
      usedAt: null,
      grant: { id: 'grant_1', clientId: 'claude', revokedAt: null, scopes: ['read'] },
    });

    const result = await exchangeAuthorizationCode({
      code,
      clientId: 'claude',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeVerifier: 'wrong-verifier-bbbbbbbbbbbbbb',
    });

    expect(result).toEqual({ error: 'invalid_grant' });
  });

  it('rejects a reused auth code and revokes the grant', async () => {
    const code = 'used-code';
    prismaMock.mcpAuthCode.findUnique.mockResolvedValue({
      id: 'code_1',
      grantId: 'grant_1',
      codeHash: hash(code),
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: pkceS256Challenge('verifier-cccccccccccccccc'),
      codeChallengeMethod: 'S256',
      expiresAt: new Date(Date.now() + 30_000),
      usedAt: new Date(),
      grant: { id: 'grant_1', clientId: 'claude', revokedAt: null, scopes: ['read'] },
    });

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
    prismaMock.mcpAuthCode.findUnique.mockResolvedValue({
      id: 'code_1',
      grantId: 'grant_1',
      codeHash: hash(code),
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: pkceS256Challenge('verifier-dddddddddddddddd'),
      codeChallengeMethod: 'S256',
      expiresAt: new Date(Date.now() - 1_000),
      usedAt: null,
      grant: { id: 'grant_1', clientId: 'claude', revokedAt: null, scopes: ['read'] },
    });

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
    prismaMock.mcpRefreshToken.findUnique.mockResolvedValue({
      id: 'rt_1',
      grantId: 'grant_1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      replacedById: 'rt_2',
      grant: { clientId: 'claude', revokedAt: null, scopes: ['read'] },
    });

    const result = await rotateRefreshToken({
      refreshToken: 'old-refresh',
      clientId: 'claude',
    });

    expect(result).toEqual({ error: 'invalid_grant' });
    expect(prismaMock.mcpOAuthGrant.update).toHaveBeenCalled();
  });
});
