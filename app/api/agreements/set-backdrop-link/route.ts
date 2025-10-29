import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const setBackdropLinkSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  backdropLinkId: z.string().nullable(),
});

export async function PUT(request: NextRequest) {
  try {
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

    console.log('Backdrop link set for agreement:', updatedAgreement.id);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement
    });

  } catch (error: any) {
    console.error('Error setting backdrop link:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to set backdrop link' 
    }, { status: 500 });
  }
}

