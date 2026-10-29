import {
  isAllowedRedirectUri,
  isMcpEnabled,
  mcpDisabledResponse,
} from '@/lib/mcp/config';
import { parseClientCredentials, verifyPreRegisteredClient } from '@/lib/mcp/clientAuth';
import { getRequestIp } from '@/lib/mcp/requestIp';
import { isIpRateLimited, rateLimitResponse, recordMcpAttempt } from '@/lib/mcp/rateLimit';
import { exchangeAuthorizationCode, rotateRefreshToken } from '@/lib/mcp/tokens';

function oauthError(error: string, description?: string, status = 400): Response {
  return Response.json(
    {
      error,
      ...(description ? { error_description: description } : {}),
    },
    { status },
  );
}

export async function POST(request: Request) {
  if (!isMcpEnabled()) {
    return mcpDisabledResponse();
  }

  const ip = getRequestIp(request);
  if (await isIpRateLimited(ip, 'token')) {
    return rateLimitResponse();
  }

  let body: URLSearchParams;
  try {
    const text = await request.text();
    body = new URLSearchParams(text);
  } catch {
    await recordMcpAttempt({ ip, kind: 'token', success: false });
    return oauthError('invalid_request', 'Could not parse form body');
  }

  const credentials = parseClientCredentials(request, body);
  if (!credentials || !verifyPreRegisteredClient(credentials.clientId, credentials.clientSecret)) {
    await recordMcpAttempt({ ip, kind: 'token', success: false });
    return oauthError('invalid_client', 'Client authentication failed', 401);
  }

  const grantType = body.get('grant_type') || '';

  if (grantType === 'authorization_code') {
    const code = body.get('code') || '';
    const redirectUri = body.get('redirect_uri') || '';
    const codeVerifier = body.get('code_verifier') || '';
    const codeChallengeMethod = body.get('code_challenge_method');

    if (codeChallengeMethod === 'plain') {
      await recordMcpAttempt({ ip, kind: 'token', success: false });
      return oauthError('invalid_request', 'PKCE method plain is not allowed');
    }

    if (!code || !redirectUri || !codeVerifier) {
      await recordMcpAttempt({ ip, kind: 'token', success: false });
      return oauthError('invalid_request', 'code, redirect_uri, and code_verifier are required');
    }

    if (!isAllowedRedirectUri(redirectUri)) {
      await recordMcpAttempt({ ip, kind: 'token', success: false });
      return oauthError('invalid_request', 'redirect_uri is not allowed');
    }

    const result = await exchangeAuthorizationCode({
      code,
      clientId: credentials.clientId,
      redirectUri,
      codeVerifier,
    });

    if ('error' in result) {
      await recordMcpAttempt({ ip, kind: 'token', success: false });
      return oauthError(result.error);
    }

    await recordMcpAttempt({ ip, kind: 'token', success: true });
    return Response.json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: result.expiresIn,
      refresh_token: result.refreshToken,
      scope: result.scopes.join(' '),
    });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = body.get('refresh_token') || '';
    if (!refreshToken) {
      await recordMcpAttempt({ ip, kind: 'refresh', success: false });
      return oauthError('invalid_request', 'refresh_token is required');
    }

    const result = await rotateRefreshToken({
      refreshToken,
      clientId: credentials.clientId,
    });

    if ('error' in result) {
      await recordMcpAttempt({ ip, kind: 'refresh', success: false });
      return oauthError(result.error);
    }

    await recordMcpAttempt({ ip, kind: 'refresh', success: true });
    return Response.json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: result.expiresIn,
      refresh_token: result.refreshToken,
      scope: result.scopes.join(' '),
    });
  }

  await recordMcpAttempt({ ip, kind: 'token', success: false });
  return oauthError('unsupported_grant_type');
}
