import { AgreementActivityType, Prisma } from '@prisma/client';
import { logAgreementActivity } from '@/lib/activityLog';
import { MCP_ACTOR } from '@/lib/mcp/config';
import { getMcpPrisma } from '@/lib/mcp/db';

export async function logMcpAgreementActivity(
  agreementId: string,
  type: AgreementActivityType,
  tool: string,
  before: unknown,
  after: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  const meta = {
    actor: MCP_ACTOR,
    tool,
    before,
    after,
    ...extra,
  } as Prisma.InputJsonValue;
  await logAgreementActivity(agreementId, type, meta);
}

export async function logMcpAudit(
  action: string,
  tool: string,
  metadata: Record<string, unknown>,
  agreementId?: string | null,
): Promise<void> {
  const prisma = getMcpPrisma();
  await prisma.auditLog.create({
    data: {
      actor: MCP_ACTOR,
      action,
      agreementId: agreementId ?? null,
      metadata: {
        tool,
        ...metadata,
      } as Prisma.InputJsonValue,
    },
  });
}
