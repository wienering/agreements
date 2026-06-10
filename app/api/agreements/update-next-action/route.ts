import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const updateNextActionSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  nextAction: z.string().max(500, 'Next action must be 500 characters or less'),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = updateNextActionSchema.parse(body);

    // Check if agreement exists
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      select: { id: true }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    // Update the agreement
    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.agreementId },
      data: {
        nextAction: validatedData.nextAction || null
      },
      include: {
        client: true,
        template: true
      }
    });

    devLog('Next action updated for agreement:', updatedAgreement.id);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement
    });

  } catch (error) {
    return handleApiError(error, 'agreements/update-next-action');
  }
}

