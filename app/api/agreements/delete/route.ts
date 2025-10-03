import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const agreementDeleteSchema = z.object({
  id: z.string().min(1, 'Agreement ID is required'),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Agreement delete request body:', body);
    
    const validatedData = agreementDeleteSchema.parse(body);
    console.log('Validated data:', validatedData);

    // First, check if the agreement exists and get its status
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.id },
      select: { id: true, status: true }
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Only allow deletion if the agreement is in DRAFT status
    if (agreement.status !== 'DRAFT') {
      return NextResponse.json({ 
        error: `Cannot delete agreement with status '${agreement.status}'. Only DRAFT agreements can be deleted.` 
      }, { status: 400 });
    }

    // Delete the agreement (this will also delete related records due to cascade)
    await prisma.agreement.delete({
      where: { id: validatedData.id }
    });

    console.log('Agreement deleted successfully:', validatedData.id);
    return NextResponse.json({ success: true, message: 'Agreement deleted successfully' });
  } catch (error: any) {
    console.error('Agreement delete error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error deleting agreement:', error);
    return NextResponse.json({ error: 'Failed to delete agreement' }, { status: 500 });
  }
}
