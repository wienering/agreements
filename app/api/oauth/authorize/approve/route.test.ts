import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const requireAdmin = vi.hoisted(() => vi.fn());
const getServerSession = vi.hoisted(() => vi.fn());
const createAuthorizationCode = vi.hoisted(() => vi.fn());
const sendTelegramMessage = vi.hoisted(() => vi.fn());
const recordMcpAttempt = vi.hoisted(() => vi.fn());
const isIpRateLimited = vi.hoisted(() => vi.fn());

vi.mock('@/lib/requireAdmin', () => ({
  requireAdmin,
  adminAuthResponse: (error: unknown) => {
    if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AdminAuthError') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return null;
  },
  AdminAuthError: class AdminAuthError extends Error {
    name = 'AdminAuthError';
  },
  CsrfError: class CsrfError extends Error {
    name = 'CsrfError';
  },
}));

vi.mock('next-auth', () => ({
  getServerSession,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/mcp/tokens', () => ({
  createAuthorizationCode,
  resolveGrantedScopes: (scopes: string[]) => {
    const out: string[] = [];
    if (scopes.includes('read') || scopes.includes('write')) out.push('read');
    if (scopes.includes('write')) out.push('write');
    return out;
  },
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage,
}));

vi.mock('@/lib/mcp/rateLimit', () => ({
  recordMcpAttempt,
  isIpRateLimited,
  rateLimitResponse: () => Response.json({ error: 'too_many_requests' }, { status: 429 }),
}));

import { POST } from '@/app/api/oauth/authorize/approve/route';

const ORIGINAL = { ...process.env };

function approveRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/oauth/authorize/approve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-requested-with': 'agreements-admin',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/oauth/authorize/approve', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    process.env.MCP_ENABLED = 'true';
    process.env.MCP_CLIENT_ID = 'claude-client';
    process.env.MCP_ALLOWED_EMAILS = 'admin@example.com';
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ user: { email: 'admin@example.com' } });
    isIpRateLimited.mockResolvedValue(false);
    recordMcpAttempt.mockResolvedValue(undefined);
    sendTelegramMessage.mockResolvedValue(undefined);
  });

  it('returns 404 when MCP is disabled', async () => {
    process.env.MCP_ENABLED = 'false';
    const response = await POST(approveRequest({}));
    expect(response.status).toBe(404);
  });

  it('rejects a non-allowlisted admin email', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'other@example.com' } });
    const response = await POST(
      approveRequest({
        client_id: 'claude-client',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        state: 's',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        scope: 'read',
      }),
    );
    expect(response.status).toBe(403);
    expect(createAuthorizationCode).not.toHaveBeenCalled();
  });

  it('creates a code and returns redirectTo for an allowlisted admin', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'admin@example.com' } });
    createAuthorizationCode.mockResolvedValue({ code: 'the-code', grantId: 'grant_1' });

    const response = await POST(
      approveRequest({
        client_id: 'claude-client',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        state: 'state-xyz',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        scope: 'read',
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.redirectTo).toContain('code=the-code');
    expect(body.redirectTo).toContain('state=state-xyz');
    expect(sendTelegramMessage).toHaveBeenCalled();
  });
});
