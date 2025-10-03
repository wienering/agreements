import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const archiveAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = archiveAgreementSchema.parse(body);

    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Agreement archived successfully',
      agreement: updatedAgreement
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error archiving agreement:', error);
    return NextResponse.json({ 
      error: 'Failed to archive agreement' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = archiveAgreementSchema.parse(body);

    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        archived: false,
        archivedAt: null,
      },
    });

    return NextResponse.json({
      message: 'Agreement unarchived successfully',
      agreement: updatedAgreement
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error unarchiving agreement:', error);
    return NextResponse.json({ 
      error: 'Failed to unarchive agreement' 
    }, { status: 500 });
  }
}
