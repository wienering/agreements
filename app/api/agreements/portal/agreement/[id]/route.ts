import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSession } from '../../shared/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate session
    const authResult = await authenticateSession(request);
    if (authResult.error) {
      return authResult.error;
    }

    const session = authResult.session;

    const { id: agreementId } = await params;

    // Get agreement details - use email to match all client records with same email
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        client: {
          email: session.client.email.toLowerCase(),
        }
      },
      include: {
        client: true,
        template: true,
        notes: {
          orderBy: { createdAt: 'desc' }
        },
        signature: true
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
        templateName: agreement.template.title,
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
