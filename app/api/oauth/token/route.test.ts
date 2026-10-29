import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchangeAuthorizationCode = vi.hoisted(() => vi.fn());
const rotateRefreshToken = vi.hoisted(() => vi.fn());
const recordMcpAttempt = vi.hoisted(() => vi.fn());
const isIpRateLimited = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mcp/tokens', () => ({
  exchangeAuthorizationCode,
  rotateRefreshToken,
}));

vi.mock('@/lib/mcp/rateLimit', () => ({
  recordMcpAttempt,
  isIpRateLimited,
  rateLimitResponse: () => Response.json({ error: 'too_many_requests' }, { status: 429 }),
}));

import { POST } from '@/app/api/oauth/token/route';

const ORIGINAL = { ...process.env };

function formRequest(body: Record<string, string>, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/oauth/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    body: new URLSearchParams(body).toString(),
  });
}

describe('POST /api/oauth/token', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    process.env.MCP_ENABLED = 'true';
    process.env.MCP_CLIENT_ID = 'claude-client';
    process.env.MCP_CLIENT_SECRET = 'super-secret';
    vi.clearAllMocks();
    isIpRateLimited.mockResolvedValue(false);
    recordMcpAttempt.mockResolvedValue(undefined);
  });

  it('returns 404 when MCP_ENABLED is off', async () => {
    process.env.MCP_ENABLED = 'false';
    const response = await POST(formRequest({ grant_type: 'authorization_code' }));
    expect(response.status).toBe(404);
  });

  it('rejects a wrong client secret', async () => {
    const response = await POST(
      formRequest({
        grant_type: 'authorization_code',
        client_id: 'claude-client',
        client_secret: 'wrong',
        code: 'abc',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        code_verifier: 'verifier',
      }),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('invalid_client');
  });

  it('rejects plain PKCE method', async () => {
    const response = await POST(
      formRequest({
        grant_type: 'authorization_code',
        client_id: 'claude-client',
        client_secret: 'super-secret',
        code: 'abc',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        code_verifier: 'verifier',
        code_challenge_method: 'plain',
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error_description).toMatch(/plain/);
  });

  it('rejects a wrong redirect URI', async () => {
    const response = await POST(
      formRequest({
        grant_type: 'authorization_code',
        client_id: 'claude-client',
        client_secret: 'super-secret',
        code: 'abc',
        redirect_uri: 'https://evil.example/cb',
        code_verifier: 'verifier',
      }),
    );
    expect(response.status).toBe(400);
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled();
  });

  it('returns tokens on a valid authorization_code exchange', async () => {
    exchangeAuthorizationCode.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      scopes: ['read'],
    });

    const response = await POST(
      formRequest({
        grant_type: 'authorization_code',
        client_id: 'claude-client',
        client_secret: 'super-secret',
        code: 'abc',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        code_verifier: 'verifier-eeeeeeeeeeeeeeee',
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.access_token).toBe('access');
    expect(body.refresh_token).toBe('refresh');
    expect(body.scope).toBe('read');
  });
});
