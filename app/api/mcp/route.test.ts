import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

describe('mcp tool schemas', () => {
  const searchClientsSchema = z.strictObject({
    query: z.string().min(1).max(200),
  });

  it('rejects unknown fields', () => {
    const result = searchClientsSchema.safeParse({ query: 'Samreen', extra: true });
    expect(result.success).toBe(false);
  });

  it('accepts a valid query', () => {
    expect(searchClientsSchema.parse({ query: 'Samreen' })).toEqual({ query: 'Samreen' });
  });
});

const verifyAccessToken = vi.hoisted(() => vi.fn());
const isMcpUnauthIpRateLimited = vi.hoisted(() => vi.fn());
const consumeGrantRateLimit = vi.hoisted(() => vi.fn());
const recordMcpAttempt = vi.hoisted(() => vi.fn());

vi.mock('@/lib/mcp/tokens', () => ({
  verifyAccessToken,
}));

vi.mock('@/lib/mcp/rateLimit', () => ({
  isMcpUnauthIpRateLimited,
  consumeGrantRateLimit,
  recordMcpAttempt,
  rateLimitResponse: () => Response.json({ error: 'too_many_requests' }, { status: 429 }),
}));

vi.mock('mcp-handler', () => ({
  createMcpHandler: () => async () => Response.json({ ok: true }),
  withMcpAuth: (handler: (req: Request) => Promise<Response>, verify: Function) => {
    return async (req: Request) => {
      const auth = req.headers.get('authorization');
      const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
      const info = await verify(req, token);
      if (!info) {
        return new Response(null, {
          status: 401,
          headers: {
            'WWW-Authenticate':
              'Bearer error="invalid_token", scope="read", resource_metadata="https://example.com/.well-known/oauth-protected-resource"',
          },
        });
      }
      return handler(req);
    };
  },
}));

import { GET } from '@/app/api/mcp/route';

const ORIGINAL = { ...process.env };

describe('GET /api/mcp', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    process.env.MCP_ENABLED = 'true';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
    vi.clearAllMocks();
    isMcpUnauthIpRateLimited.mockResolvedValue(false);
    consumeGrantRateLimit.mockResolvedValue(true);
    recordMcpAttempt.mockResolvedValue(undefined);
  });

  it('returns 404 when MCP_ENABLED is off', async () => {
    process.env.MCP_ENABLED = 'false';
    const response = await GET(new Request('https://example.com/api/mcp'));
    expect(response.status).toBe(404);
  });

  it('returns 401 with WWW-Authenticate when the bearer token is missing', async () => {
    verifyAccessToken.mockResolvedValue(null);
    const response = await GET(new Request('https://example.com/api/mcp'));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toMatch(/resource_metadata/);
    expect(response.headers.get('WWW-Authenticate')).toContain('scope="read write"');
    expect(response.headers.get('WWW-Authenticate')).not.toContain('scope="read",');
    expect(recordMcpAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'mcp', success: false }),
    );
  });

  it('does not write attempt logs for successful authenticated calls', async () => {
    verifyAccessToken.mockResolvedValue({
      grantId: 'grant_1',
      tokenId: 'tok_1',
      clientId: 'claude',
      userEmail: 'a@b.c',
      scopes: ['read'],
    });

    const response = await GET(
      new Request('https://example.com/api/mcp', {
        headers: { authorization: 'Bearer good-token' },
      }),
    );

    expect(response.status).toBe(200);
    expect(consumeGrantRateLimit).toHaveBeenCalledWith('grant_1');
    expect(recordMcpAttempt).not.toHaveBeenCalled();
  });

  it('returns 429 when the per-grant limit is exceeded', async () => {
    verifyAccessToken.mockResolvedValue({
      grantId: 'grant_1',
      tokenId: 'tok_1',
      clientId: 'claude',
      userEmail: 'a@b.c',
      scopes: ['read'],
    });
    consumeGrantRateLimit.mockResolvedValue(false);

    const response = await GET(
      new Request('https://example.com/api/mcp', {
        headers: { authorization: 'Bearer good-token' },
      }),
    );

    expect(response.status).toBe(429);
    expect(recordMcpAttempt).not.toHaveBeenCalled();
  });
});
