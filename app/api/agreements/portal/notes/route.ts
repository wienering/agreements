import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const agreementId = searchParams.get('agreementId');

    // Build where clause
    const whereClause: any = {
      clientId: session.client.id
    };

    if (agreementId) {
      // Verify agreement belongs to this client
      const agreement = await prisma.agreement.findFirst({
        where: {
          id: agreementId,
          clientId: session.client.id
        }
      });

      if (!agreement) {
        return NextResponse.json({ 
          error: 'Agreement not found or does not belong to this client' 
        }, { status: 404 });
      }

      whereClause.agreementId = agreementId;
    }

    // Get notes
    const notes = await prisma.clientNote.findMany({
      where: whereClause,
      include: {
        agreement: {
          select: {
            id: true,
            uniqueToken: true,
            template: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    // Format notes for response
    const formattedNotes = notes.map(note => ({
      id: note.id,
      content: note.content,
      agreementId: note.agreementId,
      createdAt: note.createdAt,
      agreement: note.agreement ? {
        id: note.agreement.id,
        uniqueToken: note.agreement.uniqueToken,
        templateTitle: note.agreement.template.title
      } : null
    }));

    return NextResponse.json({
      success: true,
      notes: formattedNotes,
      totalCount: notes.length
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch notes' 
    }, { status: 500 });
  }
}
