import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const clientDeleteSchema = z.object({
  id: z.string().min(1, 'Client ID is required'),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = clientDeleteSchema.parse(body);

    // Check if client is being used by any agreements
    const agreementsUsingClient = await prisma.agreement.count({
      where: {
        clientId: validatedData.id
      }
    });

    if (agreementsUsingClient > 0) {
      return NextResponse.json({ 
        error: `Cannot delete client. They are associated with ${agreementsUsingClient} agreement(s). Please delete or reassign the agreements first.` 
      }, { status: 400 });
    }

    // Delete the client
    await prisma.client.delete({
      where: { id: validatedData.id }
    });

    return NextResponse.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
