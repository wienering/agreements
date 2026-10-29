import { getMcpPrisma } from '@/lib/mcp/db';
import { sendTelegramMessage } from '@/lib/telegram';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 60;
const MAX_FAILED_PER_IP = 20;
const ALERT_THRESHOLD = 10;
/** Authenticated MCP tool traffic per grant (Claude shares egress IPs). */
const MAX_PER_GRANT = 300;

export type McpAttemptKind = 'token' | 'authorize' | 'mcp' | 'refresh';

export async function recordMcpAttempt(options: {
  ip: string;
  kind: McpAttemptKind;
  success: boolean;
}): Promise<void> {
  const prisma = getMcpPrisma();
  await prisma.mcpAuthAttemptLog.create({
    data: {
      ip: options.ip,
      kind: options.kind,
      success: options.success,
    },
  });

  if (!options.success) {
    await maybeAlertRepeatedFailures(options.ip, options.kind);
  }
}

async function maybeAlertRepeatedFailures(ip: string, kind: McpAttemptKind): Promise<void> {
  const prisma = getMcpPrisma();
  const since = new Date(Date.now() - WINDOW_MS);
  const failed = await prisma.mcpAuthAttemptLog.count({
    where: {
      ip,
      kind,
      success: false,
      createdAt: { gte: since },
    },
  });

  if (failed === ALERT_THRESHOLD || (failed > ALERT_THRESHOLD && failed % ALERT_THRESHOLD === 0)) {
    await sendTelegramMessage(
      `MCP auth: ${failed} failed ${kind} attempts from ${ip} in the last 15 minutes.`,
    );
  }
}

/** Per-IP limits for OAuth token/approve (counts successes and failures). */
export async function isIpRateLimited(ip: string, kind?: McpAttemptKind): Promise<boolean> {
  const prisma = getMcpPrisma();
  const since = new Date(Date.now() - WINDOW_MS);

  const total = await prisma.mcpAuthAttemptLog.count({
    where: {
      ip,
      createdAt: { gte: since },
      ...(kind ? { kind } : {}),
    },
  });
  if (total >= MAX_PER_IP) return true;

  const failed = await prisma.mcpAuthAttemptLog.count({
    where: {
      ip,
      success: false,
      createdAt: { gte: since },
      ...(kind ? { kind } : {}),
    },
  });
  return failed >= MAX_FAILED_PER_IP;
}

/**
 * Per-IP limit for /api/mcp only: failed/unauthenticated attempts.
 * Successful authenticated Claude traffic must not consume this budget.
 */
export async function isMcpUnauthIpRateLimited(ip: string): Promise<boolean> {
  const prisma = getMcpPrisma();
  const since = new Date(Date.now() - WINDOW_MS);
  const failed = await prisma.mcpAuthAttemptLog.count({
    where: {
      ip,
      kind: 'mcp',
      success: false,
      createdAt: { gte: since },
    },
  });
  return failed >= MAX_FAILED_PER_IP;
}

/**
 * Sliding-window counter on the grant (not attempt logs) for authenticated MCP calls.
 * @returns true when the request is allowed
 */
export async function consumeGrantRateLimit(grantId: string): Promise<boolean> {
  const prisma = getMcpPrisma();
  const now = new Date();
  const grant = await prisma.mcpOAuthGrant.findUnique({
    where: { id: grantId },
    select: { rateLimitCount: true, rateLimitWindowStart: true, revokedAt: true },
  });

  if (!grant || grant.revokedAt) {
    return false;
  }

  const windowStart = grant.rateLimitWindowStart;
  const windowExpired =
    !windowStart || now.getTime() - windowStart.getTime() >= WINDOW_MS;

  if (windowExpired) {
    await prisma.mcpOAuthGrant.update({
      where: { id: grantId },
      data: { rateLimitCount: 1, rateLimitWindowStart: now },
    });
    return true;
  }

  if (grant.rateLimitCount >= MAX_PER_GRANT) {
    return false;
  }

  const updated = await prisma.mcpOAuthGrant.updateMany({
    where: {
      id: grantId,
      rateLimitCount: { lt: MAX_PER_GRANT },
      rateLimitWindowStart: windowStart,
    },
    data: { rateLimitCount: { increment: 1 } },
  });

  return updated.count === 1;
}

export async function deleteOldMcpAuthAttemptLogs(olderThanDays = 7): Promise<number> {
  const prisma = getMcpPrisma();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await prisma.mcpAuthAttemptLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}

export function rateLimitResponse(): Response {
  return Response.json(
    { error: 'too_many_requests', error_description: 'Rate limit exceeded. Try again later.' },
    { status: 429 },
  );
}
