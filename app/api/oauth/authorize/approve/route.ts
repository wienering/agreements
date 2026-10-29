import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/requireAdmin';
import { handleApiError } from '@/lib/handleApiError';
import {
  isMcpAllowedEmail,
  isMcpEnabled,
  mcpDisabledResponse,
} from '@/lib/mcp/config';
import { parseAuthorizeQuery } from '@/lib/mcp/authorizeParams';
import { createAuthorizationCode } from '@/lib/mcp/tokens';
import { getRequestIp } from '@/lib/mcp/requestIp';
import { isIpRateLimited, rateLimitResponse, recordMcpAttempt } from '@/lib/mcp/rateLimit';
import { sendTelegramMessage } from '@/lib/telegram';

const bodySchema = z.strictObject({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string().min(1),
  code_challenge: z.string().min(43),
  code_challenge_method: z.literal('S256'),
  scope: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!isMcpEnabled()) {
    return mcpDisabledResponse();
  }

  const ip = getRequestIp(request);
  if (await isIpRateLimited(ip, 'authorize')) {
    return rateLimitResponse();
  }

  try {
    await requireAdmin(request);

    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!isMcpAllowedEmail(email)) {
      await recordMcpAttempt({ ip, kind: 'authorize', success: false });
      return NextResponse.json({ error: 'Email is not allowlisted for MCP' }, { status: 403 });
    }

    const json = await request.json();
    const body = bodySchema.parse(json);

    const params = new URLSearchParams({
      client_id: body.client_id,
      redirect_uri: body.redirect_uri,
      response_type: 'code',
      state: body.state,
      code_challenge: body.code_challenge,
      code_challenge_method: body.code_challenge_method,
      scope: body.scope || 'read',
    });

    const parsed = parseAuthorizeQuery(params);
    if (!parsed.ok) {
      await recordMcpAttempt({ ip, kind: 'authorize', success: false });
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const { code, grantId } = await createAuthorizationCode({
      clientId: parsed.value.clientId,
      userEmail: email!,
      scopes: parsed.value.scopes,
      redirectUri: parsed.value.redirectUri,
      codeChallenge: parsed.value.codeChallenge,
      codeChallengeMethod: 'S256',
    });

    await recordMcpAttempt({ ip, kind: 'authorize', success: true });
    await sendTelegramMessage(
      `MCP connected app approved for ${email} (grant ${grantId}, scopes: ${parsed.value.scopes.join(' ')}).`,
    );

    const redirect = new URL(parsed.value.redirectUri);
    redirect.searchParams.set('code', code);
    redirect.searchParams.set('state', parsed.value.state);

    return NextResponse.json({ redirectTo: redirect.toString() });
  } catch (error) {
    await recordMcpAttempt({ ip, kind: 'authorize', success: false });
    return handleApiError(error, 'api/oauth/authorize/approve', request.method);
  }
}
