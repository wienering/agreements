import { PrismaClient } from '@prisma/client';
import { prisma as appPrisma } from '@/lib/prisma';

const globalForMcp = global as unknown as { mcpPrisma?: PrismaClient };

/**
 * Prisma client for MCP traffic. Uses MCP_DATABASE_URL when set (separate role),
 * otherwise the app's shared client.
 */
export function getMcpPrisma(): PrismaClient {
  const url = process.env.MCP_DATABASE_URL?.trim();
  if (!url) {
    return appPrisma;
  }

  if (!globalForMcp.mcpPrisma) {
    globalForMcp.mcpPrisma = new PrismaClient({
      datasources: { db: { url } },
      log: ['error', 'warn'],
    });
  }
  return globalForMcp.mcpPrisma;
}
