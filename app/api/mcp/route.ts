import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { z } from 'zod';
import {
  getMcpResourceUrl,
  isMcpEnabled,
  mcpDisabledResponse,
} from '@/lib/mcp/config';
import { verifyAccessToken } from '@/lib/mcp/tokens';
import { getRequestIp } from '@/lib/mcp/requestIp';
import { isIpRateLimited, rateLimitResponse, recordMcpAttempt } from '@/lib/mcp/rateLimit';
import { searchClients, getClient } from '@/lib/mcp/tools/clients';
import { searchAgreements, getAgreement } from '@/lib/mcp/tools/agreements';
import { handleApiError } from '@/lib/handleApiError';

const agreementStatusSchema = z.enum(['DRAFT', 'SENT', 'SIGNED', 'COMPLETED', 'CANCELLED']);

const searchClientsSchema = z.strictObject({
  query: z.string().min(1).max(200),
});

const getClientSchema = z.strictObject({
  id: z.string().min(1),
});

const searchAgreementsSchema = z.strictObject({
  query: z.string().min(1).max(200).optional(),
  dateFrom: z.string().min(1).optional(),
  dateTo: z.string().min(1).optional(),
  status: agreementStatusSchema.optional(),
});

const getAgreementSchema = z.strictObject({
  id: z.string().min(1),
});

function toolResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    isError: true as const,
  };
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'search_clients',
      {
        description:
          'Search clients by name, email, or company. Returns up to 10 matches with id, name, email, company, greeting name, and upcoming event date.',
        inputSchema: searchClientsSchema,
      },
      async ({ query }) => {
        try {
          return toolResult(await searchClients(query));
        } catch (error) {
          console.error('[mcp] search_clients failed');
          return toolError('search_clients failed');
        }
      },
    );

    server.registerTool(
      'get_client',
      {
        description: 'Get a client by id. Free-text notes are returned as clientProvidedText.',
        inputSchema: getClientSchema,
      },
      async ({ id }) => {
        try {
          const client = await getClient(id);
          if (!client) return toolError('Client not found');
          return toolResult(client);
        } catch (error) {
          console.error('[mcp] get_client failed');
          return toolError('get_client failed');
        }
      },
    );

    server.registerTool(
      'search_agreements',
      {
        description:
          'Search agreements by optional query, date range, and status. Returns up to 10 summary rows.',
        inputSchema: searchAgreementsSchema,
      },
      async (args) => {
        try {
          return toolResult(await searchAgreements(args));
        } catch (error) {
          console.error('[mcp] search_agreements failed');
          return toolError('search_agreements failed');
        }
      },
    );

    server.registerTool(
      'get_agreement',
      {
        description:
          'Get an agreement summary by id. Never returns signing tokens, OTP codes, signature images, or HTML bodies.',
        inputSchema: getAgreementSchema,
      },
      async ({ id }) => {
        try {
          const agreement = await getAgreement(id);
          if (!agreement) return toolError('Agreement not found');
          return toolResult(agreement);
        } catch (error) {
          console.error('[mcp] get_agreement failed');
          return toolError('get_agreement failed');
        }
      },
    );
  },
  {
    serverInfo: {
      name: 'agreements-mcp',
      version: '1.0.0',
    },
  },
);

async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const verified = await verifyAccessToken(bearerToken);
  if (!verified) return undefined;
  if (!verified.scopes.includes('read')) return undefined;

  return {
    token: bearerToken,
    clientId: verified.clientId,
    scopes: verified.scopes,
    extra: {
      grantId: verified.grantId,
      userEmail: verified.userEmail,
    },
  };
}

const authHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  requiredScopes: ['read'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
  resourceUrl: getMcpResourceUrl(),
});

async function handle(request: Request): Promise<Response> {
  if (!isMcpEnabled()) {
    return mcpDisabledResponse();
  }

  try {
    const ip = getRequestIp(request);
    if (await isIpRateLimited(ip, 'mcp')) {
      return rateLimitResponse();
    }

    const response = await authHandler(request);
    const ok = response.status < 400;
    await recordMcpAttempt({ ip, kind: 'mcp', success: ok });
    return response;
  } catch (error) {
    console.error('[mcp] handler error');
    await handleApiError(error, 'api/mcp', request.method);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { handle as GET, handle as POST, handle as DELETE };
