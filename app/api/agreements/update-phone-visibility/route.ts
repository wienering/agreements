import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const updatePhoneVisibilitySchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  showPhoneNumberAlways: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const validatedData = updatePhoneVisibilitySchema.parse(body);

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
        showPhoneNumberAlways: validatedData.showPhoneNumberAlways
      },
      include: {
        client: true,
        template: true
      }
    });

    devLog('Phone visibility updated for agreement:', updatedAgreement.id);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement
    });

  } catch (error) {
    return handleApiError(error, 'agreements/update-phone-visibility');
  }
}

