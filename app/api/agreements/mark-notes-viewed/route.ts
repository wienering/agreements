import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const markNotesViewedSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { agreementId } = markNotesViewedSchema.parse(body);

    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { id: true },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    await prisma.agreement.update({
      where: { id: agreementId },
      data: { notesLastViewedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    return handleApiError(error, 'agreements/mark-notes-viewed');
  }
}
