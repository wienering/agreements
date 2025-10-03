import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateStatusSchema = z.object({
  id: z.string().min(1, 'Agreement ID is required'),
  status: z.enum(['DRAFT', 'LIVE', 'SIGNED', 'COMPLETED'], {
    errorMap: () => ({ message: 'Status must be DRAFT, LIVE, SIGNED, or COMPLETED' })
  }),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Update status request body:', body);
    
    const validatedData = updateStatusSchema.parse(body);
    console.log('Validated data:', validatedData);

    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.id },
      data: {
        status: validatedData.status,
      },
    });

    console.log('Updated agreement status:', updatedAgreement);
    return NextResponse.json(updatedAgreement);
  } catch (error: any) {
    console.error('Status update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating agreement status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
