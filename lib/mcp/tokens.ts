import {
  ACCESS_TOKEN_TTL_MS,
  AUTH_CODE_TTL_MS,
  MCP_PHASE1_SCOPES,
  REFRESH_TOKEN_TTL_MS,
  type McpScope,
} from '@/lib/mcp/config';
import { generateToken, pkceS256Challenge, sha256Hex } from '@/lib/mcp/crypto';
import { getMcpPrisma } from '@/lib/mcp/db';

export type VerifiedAccessToken = {
  grantId: string;
  tokenId: string;
  clientId: string;
  userEmail: string;
  scopes: string[];
};

export async function createAuthorizationCode(options: {
  clientId: string;
  userEmail: string;
  scopes: McpScope[];
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}): Promise<{ code: string; grantId: string }> {
  const prisma = getMcpPrisma();
  const code = generateToken(32);
  const now = new Date();

  const grant = await prisma.mcpOAuthGrant.create({
    data: {
      clientId: options.clientId,
      userEmail: options.userEmail.toLowerCase(),
      scopes: options.scopes,
      authCodes: {
        create: {
          codeHash: sha256Hex(code),
          redirectUri: options.redirectUri,
          codeChallenge: options.codeChallenge,
          codeChallengeMethod: options.codeChallengeMethod,
          expiresAt: new Date(now.getTime() + AUTH_CODE_TTL_MS),
        },
      },
    },
  });

  return { code, grantId: grant.id };
}

export async function exchangeAuthorizationCode(options: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scopes: string[] } | { error: string }> {
  const prisma = getMcpPrisma();
  const codeHash = sha256Hex(options.code);
  const now = new Date();

  const authCode = await prisma.mcpAuthCode.findUnique({
    where: { codeHash },
    include: { grant: true },
  });

  if (!authCode) {
    return { error: 'invalid_grant' };
  }
  if (authCode.usedAt) {
    await revokeGrant(authCode.grantId);
    return { error: 'invalid_grant' };
  }
  if (authCode.expiresAt <= now) {
    return { error: 'invalid_grant' };
  }
  if (authCode.grant.revokedAt) {
    return { error: 'invalid_grant' };
  }
  if (authCode.grant.clientId !== options.clientId) {
    return { error: 'invalid_grant' };
  }
  if (authCode.redirectUri !== options.redirectUri) {
    return { error: 'invalid_grant' };
  }
  if (authCode.codeChallengeMethod !== 'S256') {
    return { error: 'invalid_grant' };
  }
  if (pkceS256Challenge(options.codeVerifier) !== authCode.codeChallenge) {
    return { error: 'invalid_grant' };
  }

  const accessToken = generateToken(32);
  const refreshToken = generateToken(32);

  await prisma.$transaction([
    prisma.mcpAuthCode.update({
      where: { id: authCode.id },
      data: { usedAt: now },
    }),
    prisma.mcpAccessToken.create({
      data: {
        grantId: authCode.grantId,
        tokenHash: sha256Hex(accessToken),
        expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_MS),
      },
    }),
    prisma.mcpRefreshToken.create({
      data: {
        grantId: authCode.grantId,
        tokenHash: sha256Hex(refreshToken),
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      },
    }),
    prisma.mcpOAuthGrant.update({
      where: { id: authCode.grantId },
      data: { lastUsedAt: now },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scopes: authCode.grant.scopes,
  };
}

export async function rotateRefreshToken(options: {
  refreshToken: string;
  clientId: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; scopes: string[] } | { error: string }> {
  const prisma = getMcpPrisma();
  const tokenHash = sha256Hex(options.refreshToken);
  const now = new Date();

  const existing = await prisma.mcpRefreshToken.findUnique({
    where: { tokenHash },
    include: { grant: true },
  });

  if (!existing) {
    return { error: 'invalid_grant' };
  }

  // Reuse of a rotated/revoked refresh token revokes the whole grant.
  if (existing.revokedAt || existing.replacedById) {
    await revokeGrant(existing.grantId);
    return { error: 'invalid_grant' };
  }

  if (existing.expiresAt <= now || existing.grant.revokedAt) {
    return { error: 'invalid_grant' };
  }

  if (existing.grant.clientId !== options.clientId) {
    return { error: 'invalid_grant' };
  }

  const accessToken = generateToken(32);
  const refreshToken = generateToken(32);
  const newRefreshHash = sha256Hex(refreshToken);

  const created = await prisma.mcpRefreshToken.create({
    data: {
      grantId: existing.grantId,
      tokenHash: newRefreshHash,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
    },
  });

  await prisma.$transaction([
    prisma.mcpRefreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: now, replacedById: created.id, lastUsedAt: now },
    }),
    prisma.mcpAccessToken.create({
      data: {
        grantId: existing.grantId,
        tokenHash: sha256Hex(accessToken),
        expiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_MS),
      },
    }),
    prisma.mcpOAuthGrant.update({
      where: { id: existing.grantId },
      data: { lastUsedAt: now },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scopes: existing.grant.scopes,
  };
}

export async function verifyAccessToken(rawToken: string): Promise<VerifiedAccessToken | null> {
  const prisma = getMcpPrisma();
  const tokenHash = sha256Hex(rawToken);
  const now = new Date();

  const token = await prisma.mcpAccessToken.findUnique({
    where: { tokenHash },
    include: { grant: true },
  });

  if (!token) return null;
  if (token.revokedAt) return null;
  if (token.expiresAt <= now) return null;
  if (token.grant.revokedAt) return null;

  await prisma.$transaction([
    prisma.mcpAccessToken.update({
      where: { id: token.id },
      data: { lastUsedAt: now },
    }),
    prisma.mcpOAuthGrant.update({
      where: { id: token.grantId },
      data: { lastUsedAt: now },
    }),
  ]);

  return {
    grantId: token.grantId,
    tokenId: token.id,
    clientId: token.grant.clientId,
    userEmail: token.grant.userEmail,
    scopes: token.grant.scopes,
  };
}

export async function revokeGrant(grantId: string): Promise<void> {
  const prisma = getMcpPrisma();
  const now = new Date();
  await prisma.$transaction([
    prisma.mcpOAuthGrant.update({
      where: { id: grantId },
      data: { revokedAt: now },
    }),
    prisma.mcpAccessToken.updateMany({
      where: { grantId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.mcpRefreshToken.updateMany({
      where: { grantId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
}

export async function revokeAllGrants(): Promise<number> {
  const prisma = getMcpPrisma();
  const active = await prisma.mcpOAuthGrant.findMany({
    where: { revokedAt: null },
    select: { id: true },
  });
  for (const grant of active) {
    await revokeGrant(grant.id);
  }
  return active.length;
}

export function phase1ScopesOnly(requested: string[]): McpScope[] {
  const normalized = requested.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) {
    return [...MCP_PHASE1_SCOPES];
  }
  // Phase 1: issue read only, even if write was requested.
  return normalized.includes('read') || normalized.includes('write')
    ? ['read']
    : [];
}
