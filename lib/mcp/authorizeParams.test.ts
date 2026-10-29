import { afterEach, describe, expect, it } from 'vitest';
import { parseAuthorizeQuery } from '@/lib/mcp/authorizeParams';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('parseAuthorizeQuery', () => {
  it('rejects a non-allowlisted redirect URI before anything else', () => {
    process.env.MCP_CLIENT_ID = 'claude-client';
    const result = parseAuthorizeQuery(
      new URLSearchParams({
        client_id: 'claude-client',
        redirect_uri: 'https://evil.example/callback',
        response_type: 'code',
        state: 'abc',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        scope: 'read',
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/redirect_uri/);
    }
  });

  it('rejects plain PKCE', () => {
    process.env.MCP_CLIENT_ID = 'claude-client';
    const result = parseAuthorizeQuery(
      new URLSearchParams({
        client_id: 'claude-client',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'abc',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'plain',
        scope: 'read',
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/plain/);
    }
  });

  it('rejects a non-allowlisted client id', () => {
    process.env.MCP_CLIENT_ID = 'claude-client';
    const result = parseAuthorizeQuery(
      new URLSearchParams({
        client_id: 'other',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'abc',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        scope: 'read',
      }),
    );
    expect(result.ok).toBe(false);
  });

  it('issues read-only scopes in phase 1 even if write is requested', () => {
    process.env.MCP_CLIENT_ID = 'claude-client';
    const result = parseAuthorizeQuery(
      new URLSearchParams({
        client_id: 'claude-client',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'state-1',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        scope: 'read write',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scopes).toEqual(['read']);
    }
  });
});
