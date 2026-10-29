import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/requireAdmin';
import { handleApiError } from '@/lib/handleApiError';
import { getMcpPrisma } from '@/lib/mcp/db';
import { revokeAllGrants, revokeGrant } from '@/lib/mcp/tokens';
import { isMcpEnabled } from '@/lib/mcp/config';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!isMcpEnabled()) {
      return NextResponse.json({ enabled: false, grants: [] });
    }

    const prisma = getMcpPrisma();
    const grants = await prisma.mcpOAuthGrant.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        userEmail: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({ enabled: true, grants });
  } catch (error) {
    return handleApiError(error, 'api/admin/mcp-grants', request.method);
  }
}

const revokeSchema = z.strictObject({
  grantId: z.string().min(1).optional(),
  revokeAll: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = revokeSchema.parse(await request.json());

    if (body.revokeAll) {
      const count = await revokeAllGrants();
      return NextResponse.json({ revoked: count });
    }

    if (!body.grantId) {
      return NextResponse.json({ error: 'grantId or revokeAll required' }, { status: 400 });
    }

    await revokeGrant(body.grantId);
    return NextResponse.json({ revoked: 1 });
  } catch (error) {
    return handleApiError(error, 'api/admin/mcp-grants', request.method);
  }
}
