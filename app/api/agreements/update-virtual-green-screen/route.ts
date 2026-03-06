import { NextRequest, NextResponse } from 'next/server';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateVirtualGreenScreenSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  forceVirtualGreenScreen: z.boolean(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateVirtualGreenScreenSchema.parse(body);

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
        forceVirtualGreenScreen: validatedData.forceVirtualGreenScreen
      },
      include: {
        client: true,
        template: true
      }
    });

    devLog('Virtual green screen override updated for agreement:', updatedAgreement.id);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement
    });

  } catch (error: any) {
    console.error('Error updating virtual green screen override:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to update virtual green screen override' 
    }, { status: 500 });
  }
}

