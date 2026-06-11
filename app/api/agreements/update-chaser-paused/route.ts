import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const updateChaserPausedSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  chaserPaused: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const validatedData = updateChaserPausedSchema.parse(body);

    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      select: { id: true },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.agreementId },
      data: {
        chaserPaused: validatedData.chaserPaused,
      },
      include: {
        client: true,
        template: true,
      },
    });

    devLog('Chaser pause updated for agreement:', updatedAgreement.id, validatedData.chaserPaused);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement,
    });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    return handleApiError(error, 'agreements/update-chaser-paused');
  }
}
