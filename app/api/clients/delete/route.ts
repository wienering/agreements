import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const clientDeleteSchema = z.object({
  id: z.string().min(1, 'Client ID is required'),
});

export async function DELETE(request: NextRequest) {
  try {

    await requireAdmin();
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

    // Get client email for session deletion
    const client = await prisma.client.findUnique({
      where: { id: validatedData.id },
      select: { email: true }
    });

    if (!client) {
      return NextResponse.json({ 
        error: 'Client not found' 
      }, { status: 404 });
    }

    // Delete associated ClientNotes first (required relation)
    await prisma.clientNote.deleteMany({
      where: {
        clientId: validatedData.id
      }
    });

    // Delete associated ClientSessions
    await prisma.clientSession.deleteMany({
      where: {
        clientEmail: client.email
      }
    });

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
