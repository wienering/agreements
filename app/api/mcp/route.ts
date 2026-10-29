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
import {
  consumeGrantRateLimit,
  isMcpUnauthIpRateLimited,
  rateLimitResponse,
  recordMcpAttempt,
} from '@/lib/mcp/rateLimit';
import { McpScopeError, runWithMcpAuth } from '@/lib/mcp/authContext';
import { searchClients, getClient } from '@/lib/mcp/tools/clients';
import { searchAgreements, getAgreement } from '@/lib/mcp/tools/agreements';
import {
  addClientNote,
  createAgreementDraft,
  createClient,
  setPaymentStatus,
  updateAgreementDraft,
  updateClient,
} from '@/lib/mcp/tools/writes';
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

const clientFieldsSchema = z.strictObject({
  name: z.string().min(1).optional(),
  company: z.string().nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  emailGreetingName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

const updateClientSchema = z.strictObject({
  id: z.string().min(1),
  fields: clientFieldsSchema,
});

const createClientSchema = z.strictObject({
  fields: clientFieldsSchema.extend({
    name: z.string().min(1),
    email: z.string().email(),
    confirmDuplicate: z.boolean().optional(),
  }),
});

const setPaymentStatusSchema = z.strictObject({
  agreementId: z.string().min(1),
  status: z.string().min(1),
});

const addClientNoteSchema = z.strictObject({
  clientId: z.string().min(1),
  text: z.string().min(1).max(5000),
});

const agreementDraftFieldsSchema = z.strictObject({
  templateId: z.string().min(1).optional(),
  eventDate: z.string().min(1).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  venueAddress: z.string().nullable().optional(),
  package: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const createAgreementDraftSchema = z.strictObject({
  clientId: z.string().min(1),
  fields: agreementDraftFieldsSchema,
});

const updateAgreementDraftSchema = z.strictObject({
  id: z.string().min(1),
  fields: agreementDraftFieldsSchema,
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

function extractBearer(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice(7).trim();
  return token || undefined;
}

async function runWriteTool(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
      return toolError(String((data as { error: string }).error));
    }
    return toolResult(data);
  } catch (error) {
    if (error instanceof McpScopeError) {
      return toolError(error.message);
    }
    console.error('[mcp] write tool failed');
    return toolError('write tool failed');
  }
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'search_clients',
      {
        description:
          'Search clients by name, email, or company. Returns up to 10 matches. Dates are America/Toronto with offset.',
        inputSchema: searchClientsSchema,
      },
      async ({ query }) => {
        try {
          return toolResult(await searchClients(query));
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
          return toolError('get_agreement failed');
        }
      },
    );

    server.registerTool(
      'update_client',
      {
        description:
          'Update allowed client CRM fields (name, company, email, phone, emailGreetingName, address). Requires write scope. Company is accepted but not stored. Signed document HTML is never changed; response flags when a signed agreement still shows the original name.',
        inputSchema: updateClientSchema,
      },
      async ({ id, fields }) => runWriteTool(() => updateClient(id, fields)),
    );

    server.registerTool(
      'create_client',
      {
        description:
          'Create a client. Requires write scope. Checks for likely duplicates (same email or very similar name) unless confirmDuplicate is true. Optional billing address.',
        inputSchema: createClientSchema,
      },
      async ({ fields }) => runWriteTool(() => createClient(fields)),
    );

    server.registerTool(
      'set_payment_status',
      {
        description:
          'Set an agreement payment status to one of the canonical values. Requires write scope.',
        inputSchema: setPaymentStatusSchema,
      },
      async ({ agreementId, status }) => runWriteTool(() => setPaymentStatus(agreementId, status)),
    );

    server.registerTool(
      'add_client_note',
      {
        description: 'Add a note on a client (optionally linked to their latest agreement). Requires write scope.',
        inputSchema: addClientNoteSchema,
      },
      async ({ clientId, text }) => runWriteTool(() => addClientNote(clientId, text)),
    );

    server.registerTool(
      'create_agreement_draft',
      {
        description:
          'Create a DRAFT agreement for a client with event details. Never sends to the client. Optional templateId (defaults to first template). Returns attendant double-booking warnings when applicable. Requires write scope.',
        inputSchema: createAgreementDraftSchema,
      },
      async ({ clientId, fields }) => runWriteTool(() => createAgreementDraft(clientId, fields)),
    );

    server.registerTool(
      'update_agreement_draft',
      {
        description:
          'Update event/draft fields on an agreement that is still DRAFT/unsent. Requires write scope. Returns attendant warnings when the schedule conflicts.',
        inputSchema: updateAgreementDraftSchema,
      },
      async ({ id, fields }) => runWriteTool(() => updateAgreementDraft(id, fields)),
    );
  },
  {
    serverInfo: {
      name: 'agreements-mcp',
      version: '1.1.0',
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
    const bearer = extractBearer(request);
    const verified = bearer ? await verifyAccessToken(bearer) : null;
    const authenticated = Boolean(verified?.scopes.includes('read'));

    if (!authenticated) {
      if (await isMcpUnauthIpRateLimited(ip)) {
        return rateLimitResponse();
      }
      await recordMcpAttempt({ ip, kind: 'mcp', success: false });
      return authHandler(request);
    }

    if (!(await consumeGrantRateLimit(verified!.grantId))) {
      return rateLimitResponse();
    }

    return runWithMcpAuth(verified!, () => authHandler(request));
  } catch (error) {
    console.error('[mcp] handler error');
    await handleApiError(error, 'api/mcp', request.method);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { handle as GET, handle as POST, handle as DELETE };
