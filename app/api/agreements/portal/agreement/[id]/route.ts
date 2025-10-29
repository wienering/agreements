import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'MISSING_TOKEN' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.substring(7);

    // Validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true
      }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired', code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
    }

    // Update last activity
    await prisma.clientSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() }
    });

    const { id: agreementId } = await params;

    // Get agreement details
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        client: {
          email: session.client.email
        }
      },
      include: {
        client: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found', code: 'AGREEMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Return agreement data
    return NextResponse.json({
      agreement: {
        id: agreement.id,
        uniqueToken: agreement.uniqueToken,
        status: agreement.status,
        expiresAt: agreement.expiresAt?.toISOString() || null,
        createdAt: agreement.createdAt.toISOString(),
        signedAt: agreement.signedAt?.toISOString() || null,
        cancelledAt: agreement.cancelledAt?.toISOString() || null,
        templateName: agreement.templateName,
        mergedHtml: agreement.mergedHtml,
        notes: agreement.notes.map(note => ({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt.toISOString()
        }))
      },
      client: {
        id: agreement.client.id,
        firstName: agreement.client.firstName,
        lastName: agreement.client.lastName,
        email: agreement.client.email,
        phone: agreement.client.phone,
        address: agreement.client.address,
        phoneAddedAt: agreement.client.phoneAddedAt?.toISOString() || null,
        addressAddedAt: agreement.client.addressAddedAt?.toISOString() || null,
        eventDate: agreement.client.eventDate?.toISOString() || null,
        eventType: agreement.client.eventType,
        eventLocation: agreement.client.eventLocation,
        eventStartTime: agreement.client.eventStartTime,
        eventDuration: agreement.client.eventDuration,
        eventPackage: agreement.client.eventPackage,
        packagePrice: agreement.client.packagePrice ? Number(agreement.client.packagePrice) : null
      }
    });

  } catch (error) {
    console.error('Error fetching agreement details:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

