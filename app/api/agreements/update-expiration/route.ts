import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { formatZodDetails } from '@/lib/handleApiError';

const updateExpirationSchema = z.object({
  id: z.string().min(1, 'Agreement ID is required'),
  expiresAt: z.string().min(1, 'Expiration date is required'),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    devLog('Update expiration request body:', body);
    
    const validatedData = updateExpirationSchema.parse(body);
    devLog('Validated data:', validatedData);

    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.id },
      data: {
        expiresAt: new Date(validatedData.expiresAt),
      },
    });

    devLog('Updated agreement expiration:', updatedAgreement);
    return NextResponse.json(updatedAgreement);
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Expiration update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodDetails(error) },
        { status: 400 },
      );
    }
    console.error('Error updating agreement expiration:', error);
    return NextResponse.json({ error: 'Failed to update expiration date' }, { status: 500 });
  }
}
