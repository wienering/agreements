import {
  getMcpClientId,
  isAllowedRedirectUri,
  type McpScope,
} from '@/lib/mcp/config';
import { phase1ScopesOnly } from '@/lib/mcp/tokens';

export type AuthorizeQuery = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scopes: McpScope[];
  responseType: 'code';
};

export type AuthorizeParseResult =
  | { ok: true; value: AuthorizeQuery }
  | { ok: false; error: string; status: number };

export function parseAuthorizeQuery(
  searchParams: URLSearchParams,
): AuthorizeParseResult {
  const clientId = searchParams.get('client_id') || '';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const responseType = searchParams.get('response_type') || '';
  const state = searchParams.get('state') || '';
  const codeChallenge = searchParams.get('code_challenge') || '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') || '';
  const scopeRaw = searchParams.get('scope') || 'read';

  if (!isAllowedRedirectUri(redirectUri)) {
    return { ok: false, error: 'redirect_uri is not allowed', status: 400 };
  }

  if (clientId !== getMcpClientId()) {
    return { ok: false, error: 'Unknown client_id', status: 400 };
  }

  if (responseType !== 'code') {
    return { ok: false, error: 'response_type must be code', status: 400 };
  }

  if (codeChallengeMethod === 'plain') {
    return { ok: false, error: 'PKCE method plain is not allowed', status: 400 };
  }

  if (codeChallengeMethod !== 'S256') {
    return { ok: false, error: 'code_challenge_method must be S256', status: 400 };
  }

  if (!codeChallenge || codeChallenge.length < 43) {
    return { ok: false, error: 'Invalid code_challenge', status: 400 };
  }

  if (!state) {
    return { ok: false, error: 'state is required', status: 400 };
  }

  const scopes = phase1ScopesOnly(scopeRaw.split(/[\s+]+/));
  if (scopes.length === 0) {
    return { ok: false, error: 'No supported scopes requested', status: 400 };
  }

  return {
    ok: true,
    value: {
      clientId,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
      scopes,
      responseType: 'code',
    },
  };
}
