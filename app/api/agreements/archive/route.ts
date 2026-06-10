import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const archiveAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
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
  } catch (error) {
    return handleApiError(error, 'agreements/archive');
  }
}

export async function DELETE(request: NextRequest) {
  try {

    await requireAdmin(request);
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
  } catch (error) {
    return handleApiError(error, 'agreements/archive');
  }
}
