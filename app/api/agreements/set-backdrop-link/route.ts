import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const setBackdropLinkSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  backdropLinkId: z.string().nullable(),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = setBackdropLinkSchema.parse(body);

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

    // If backdropLinkId is provided (not null), check if it exists
    if (validatedData.backdropLinkId) {
      const backdropLink = await prisma.backdropLink.findUnique({
        where: { id: validatedData.backdropLinkId }
      });

      if (!backdropLink) {
        return NextResponse.json({ 
          error: 'Backdrop link not found' 
        }, { status: 404 });
      }
    }

    // Update the agreement
    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.agreementId },
      data: {
        backdropLinkId: validatedData.backdropLinkId
      },
      include: {
        client: true,
        template: true,
        backdropLink: true
      }
    });

    devLog('Backdrop link set for agreement:', updatedAgreement.id);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement
    });

  } catch (error) {
    return handleApiError(error, 'agreements/set-backdrop-link');
  }
}

