import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(1000, 'Note content must be less than 1000 characters'),
  agreementId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required' 
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token' 
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired' 
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = addNoteSchema.parse(body);

    // If agreementId is provided, verify it belongs to this client
    if (validatedData.agreementId) {
      const agreement = await prisma.agreement.findFirst({
        where: {
          id: validatedData.agreementId,
          clientId: session.client.id
        }
      });

      if (!agreement) {
        return NextResponse.json({ 
          error: 'Agreement not found or does not belong to this client' 
        }, { status: 404 });
      }
    }

    // Create the note
    const note = await prisma.clientNote.create({
      data: {
        clientId: session.client.id,
        agreementId: validatedData.agreementId || null,
        content: validatedData.content,
      }
    });

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'Note added successfully',
      note: {
        id: note.id,
        content: note.content,
        agreementId: note.agreementId,
        createdAt: note.createdAt,
      }
    });

  } catch (error: any) {
    console.error('Error adding note:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to add note' 
    }, { status: 500 });
  }
}
