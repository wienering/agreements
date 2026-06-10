import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/handleApiError';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const agreementId = new URL(request.url).searchParams.get('agreementId');
    if (!agreementId) {
      return NextResponse.json({ error: 'agreementId is required' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { id: true },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const notes = await prisma.clientNote.findMany({
      where: { agreementId },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    return handleApiError(error, 'agreements/client-notes');
  }
}
