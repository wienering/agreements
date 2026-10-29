import { getMcpPrisma } from '@/lib/mcp/db';
import { sendTelegramMessage } from '@/lib/telegram';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 60;
const MAX_FAILED_PER_IP = 20;
const ALERT_THRESHOLD = 10;

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

export function rateLimitResponse(): Response {
  return Response.json(
    { error: 'too_many_requests', error_description: 'Rate limit exceeded. Try again later.' },
    { status: 429 },
  );
}
