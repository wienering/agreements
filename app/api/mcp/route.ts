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
import { createAgreementForEvent, createEvent, getEvent, searchEvents, updateEvent } from '@/lib/mcp/tools/events';
import {
  createInvoice,
  listOptions,
  sendAgreement,
  sendEventGalleryEmail,
  sendEventReviewRequest,
  updateAgreement,
} from '@/lib/mcp/tools/manage';
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

const eventStatusSchema = z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED']);

const searchEventsSchema = z.strictObject({
  query: z.string().min(1).max(200).optional(),
  dateFrom: z.string().min(1).optional(),
  dateTo: z.string().min(1).optional(),
  status: eventStatusSchema.optional(),
  includeArchived: z.boolean().optional(),
});

const getEventSchema = z.strictObject({
  id: z.string().min(1),
});

const eventFieldsSchema = z.strictObject({
  eventDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  eventType: z.string().nullable().optional(),
  eventName: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  package: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]).nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  paymentStatus: z.string().optional(),
  nextAction: z.string().nullable().optional(),
  attendantName: z.string().nullable().optional(),
  status: eventStatusSchema.optional(),
  cancellationReason: z.string().nullable().optional(),
  galleryLinks: z.array(z.strictObject({ title: z.string().optional(), url: z.string().min(1) })).optional(),
  selectedBackdropName: z.string().nullable().optional(),
  showPhoneNumberAlways: z.boolean().optional(),
  forceVirtualGreenScreen: z.boolean().optional(),
  followUpsPaused: z.boolean().optional(),
  reviewReceived: z.boolean().optional(),
  archived: z.boolean().optional(),
});

const updateAgreementSchema = z.strictObject({
  id: z.string().min(1),
  fields: z.strictObject({
    expiresAt: z.string().nullable().optional(),
    templateId: z.string().min(1).optional(),
    status: agreementStatusSchema.optional(),
    chaserPaused: z.boolean().optional(),
    archived: z.boolean().optional(),
    secondSignerEnabled: z.boolean().optional(),
    secondSignerFirstName: z.string().nullable().optional(),
    secondSignerLastName: z.string().nullable().optional(),
    secondSignerEmail: z.string().nullable().optional(),
    secondSignerPhone: z.string().nullable().optional(),
    requireBothSignatures: z.boolean().optional(),
  }),
});

const sendAgreementSchema = z.strictObject({
  agreementId: z.string().min(1),
  confirm: z.boolean().optional(),
});

const sendGallerySchema = z.strictObject({
  eventId: z.string().min(1),
  resend: z.boolean().optional(),
  confirm: z.boolean().optional(),
});

const sendReviewSchema = z.strictObject({
  eventId: z.string().min(1),
  market: z.enum(['ontario', 'calgary']).optional(),
  confirm: z.boolean().optional(),
});

const createInvoiceSchema = z.strictObject({
  eventId: z.string().min(1),
  invoiceType: z.enum(['default', 'total-only', 'total-minus-deposit', 'custom-amount']).optional(),
  customAmount: z.number().positive().optional(),
  disableOnlinePayment: z.boolean().optional(),
  confirm: z.boolean().optional(),
});

const createEventSchema = z.strictObject({
  clientId: z.string().min(1),
  fields: eventFieldsSchema,
});

const updateEventSchema = z.strictObject({
  id: z.string().min(1),
  fields: eventFieldsSchema,
});

const createAgreementForEventSchema = z.strictObject({
  eventId: z.string().min(1),
  templateId: z.string().min(1).optional(),
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
      'search_events',
      {
        description:
          'Search booked events (the bookings). Defaults to upcoming events when no query or dates are given. Optional query (client name, email, venue, type), dateFrom/dateTo (YYYY-MM-DD), status (UPCOMING, COMPLETED, CANCELLED). Each event lists its agreements, if any.',
        inputSchema: searchEventsSchema,
      },
      async (args) => {
        try {
          return toolResult(await searchEvents(args));
        } catch {
          return toolError('search_events failed');
        }
      },
    );

    server.registerTool(
      'get_event',
      {
        description: 'Get one event by id (an agreement id also works): details, payment status, attendant, gallery, status and its agreements.',
        inputSchema: getEventSchema,
      },
      async ({ id }) => {
        try {
          const event = await getEvent(id);
          if (!event) return toolError('Event not found');
          return toolResult(event);
        } catch {
          return toolError('get_event failed');
        }
      },
    );

    server.registerTool(
      'create_event',
      {
        description:
          'Create a confirmed event (booking) for a client, with no agreement. Puts it on the calendar. Optional paymentStatus, attendantName, status. Requires write scope. Returns attendant double-booking warnings.',
        inputSchema: createEventSchema,
      },
      async ({ clientId, fields }) => runWriteTool(() => createEvent(clientId, fields)),
    );

    server.registerTool(
      'update_event',
      {
        description:
          'Update anything on an event: date, time, duration, venue, package, price, notes, payment status, next action, attendant (by name; see list_options), backdrop, gallery links, phone/green-screen toggles, follow-up pause, already-reviewed, archived, or status. COMPLETED completes a signed agreement on it; CANCELLED cancels its agreements; archiving archives its agreements. Sends nothing. Requires write scope.',
        inputSchema: updateEventSchema,
      },
      async ({ id, fields }) => runWriteTool(() => updateEvent(id, fields)),
    );

    server.registerTool(
      'create_agreement_for_event',
      {
        description:
          'Create a DRAFT agreement on an existing event, from a template (defaults to the first). Never sends it. Use only when the client has asked for an agreement. Requires write scope.',
        inputSchema: createAgreementForEventSchema,
      },
      async ({ eventId, templateId }) => runWriteTool(() => createAgreementForEvent(eventId, templateId)),
    );

    server.registerTool(
      'list_options',
      {
        description: 'List attendants (by name), agreement templates (id and title), and the allowed payment, event and agreement statuses.',
        inputSchema: z.strictObject({}),
      },
      async () => {
        try {
          return toolResult(await listOptions());
        } catch {
          return toolError('list_options failed');
        }
      },
    );

    server.registerTool(
      'update_agreement',
      {
        description:
          'Change an agreement: expiry date, template (drafts only), status (signing rules apply), reminder chaser pause, archive, second signer. Requires write scope. Does not send anything.',
        inputSchema: updateAgreementSchema,
      },
      async ({ id, fields }) => runWriteTool(() => updateAgreement(id, fields)),
    );

    server.registerTool(
      'send_agreement',
      {
        description:
          'Email the client their agreement to review and sign (a draft becomes SENT). Only after Dennis has confirmed in the conversation: pass confirm: true. Requires write scope.',
        inputSchema: sendAgreementSchema,
      },
      async ({ agreementId, confirm }) => runWriteTool(() => sendAgreement(agreementId, confirm)),
    );

    server.registerTool(
      'send_gallery_email',
      {
        description:
          'Email the client their gallery links for an event now (resend: true to send again). Only after Dennis has confirmed: pass confirm: true. Requires write scope.',
        inputSchema: sendGallerySchema,
      },
      async ({ eventId, resend, confirm }) => runWriteTool(() => sendEventGalleryEmail(eventId, { resend, confirm })),
    );

    server.registerTool(
      'send_review_request',
      {
        description:
          'Email the client the one-time Google review request for an event (market ontario or calgary). Only after Dennis has confirmed: pass confirm: true. Requires write scope.',
        inputSchema: sendReviewSchema,
      },
      async ({ eventId, market, confirm }) => runWriteTool(() => sendEventReviewRequest(eventId, { market, confirm })),
    );

    server.registerTool(
      'create_invoice',
      {
        description:
          'Create the Stripe invoice(s) for an event from its package price: default (deposit + balance), total-only, total-minus-deposit, or custom-amount. Stripe emails the client. Only after Dennis has confirmed: pass confirm: true. Requires write scope.',
        inputSchema: createInvoiceSchema,
      },
      async ({ eventId, ...options }) => runWriteTool(() => createInvoice(eventId, options)),
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
          'Set the payment status on an event (pass the event id, or an agreement id on it) to one of the canonical values. Requires write scope.',
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
          'Create a new event AND a DRAFT agreement on it in one step. Prefer create_event (no agreement) unless the client asked for an agreement; for an existing event use create_agreement_for_event. Never sends to the client. Requires write scope.',
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

// requiredScopes stays ['read'] so read-only grants still work, but a 401 advertises both
// scopes so clients that honor the challenge request write too.
const CHALLENGE_SCOPE = 'scope="read write"';

function withChallengeScope(response: Response): Response {
  if (response.status !== 401) return response;
  const challenge = response.headers.get('WWW-Authenticate');
  if (!challenge) return response;
  const updated = /scope="[^"]*"/.test(challenge)
    ? challenge.replace(/scope="[^"]*"/, CHALLENGE_SCOPE)
    : `${challenge}, ${CHALLENGE_SCOPE}`;
  const headers = new Headers(response.headers);
  headers.set('WWW-Authenticate', updated);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
      return withChallengeScope(await authHandler(request));
    }

    if (!(await consumeGrantRateLimit(verified!.grantId))) {
      return rateLimitResponse();
    }

    // No server-to-client stream: tool calls are plain POSTs. An authenticated GET would hold an
    // idle SSE stream open until Vercel kills it at 300s, so answer 405 (allowed by the MCP spec).
    // Unauthenticated GETs above still get the 401 + WWW-Authenticate that sign-in discovery needs.
    if (request.method === 'GET') {
      return new Response(null, { status: 405, headers: { Allow: 'POST, DELETE' } });
    }

    return runWithMcpAuth(verified!, () => authHandler(request));
  } catch (error) {
    console.error('[mcp] handler error');
    await handleApiError(error, 'api/mcp', request.method);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { handle as GET, handle as POST, handle as DELETE };
