import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateExpirationSchema = z.object({
  id: z.string().min(1, 'Agreement ID is required'),
  expiresAt: z.string().min(1, 'Expiration date is required'),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Update expiration request body:', body);
    
    const validatedData = updateExpirationSchema.parse(body);
    console.log('Validated data:', validatedData);

    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.id },
      data: {
        expiresAt: new Date(validatedData.expiresAt),
      },
    });

    console.log('Updated agreement expiration:', updatedAgreement);
    return NextResponse.json(updatedAgreement);
  } catch (error: any) {
    console.error('Expiration update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating agreement expiration:', error);
    return NextResponse.json({ error: 'Failed to update expiration date' }, { status: 500 });
  }
}
