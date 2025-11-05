import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const agreements = await prisma.agreement.findMany({
      where: {
        archived: false, // Only show non-archived agreements
      },
      include: {
        client: true,
        template: true,
        event: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(agreements);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json({ error: 'Failed to fetch agreements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, templateId, eventId, expiresAt } = body;

    // Validate required fields
    if (!clientId || !templateId) {
      return NextResponse.json({ error: 'Client ID and Template ID are required' }, { status: 400 });
    }

    // If eventId is provided, verify it exists and belongs to the client
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { clientId: true }
      });

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      if (event.clientId !== clientId) {
        return NextResponse.json({ error: 'Event does not belong to the specified client' }, { status: 400 });
      }
    }

    // Generate unique token
    const uniqueToken = randomBytes(32).toString('hex');

    const agreement = await prisma.agreement.create({
      data: {
        clientId,
        templateId,
        eventId: eventId || null,
        uniqueToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'DRAFT',
      },
      include: {
        client: true,
        template: true,
        event: true,
      },
    });

    return NextResponse.json(agreement, { status: 201 });
  } catch (error) {
    console.error('Error creating agreement:', error);
    return NextResponse.json({ error: 'Failed to create agreement' }, { status: 500 });
  }
}
