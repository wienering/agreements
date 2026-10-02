import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/handleApiError';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {

    await requireAdmin(request);

    const { clientId } = await params;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get all files for this client
    const files = await prisma.clientFile.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            eventDate: true,
            eventType: true,
          },
        },
      },
    });

    return NextResponse.json({ files });
  } catch (error) {
    return handleApiError(error, 'files/client/[clientId]', request.method);
  }
}

