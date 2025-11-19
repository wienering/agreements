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
      orderBy: { createdAt: 'desc' } // Will be sorted by event date on frontend
    });
    
    // Sort by event date (closest upcoming first), then by creation date
    const sortedAgreements = agreements.sort((a, b) => {
      const aDate = a.event?.eventDate ? new Date(a.event.eventDate).getTime() : Infinity;
      const bDate = b.event?.eventDate ? new Date(b.event.eventDate).getTime() : Infinity;
      
      // If both have event dates, sort by date (ascending - closest first)
      if (aDate !== Infinity && bDate !== Infinity) {
        if (aDate !== bDate) {
          return aDate - bDate;
        }
      } else if (aDate !== Infinity) {
        // a has date, b doesn't - a comes first
        return -1;
      } else if (bDate !== Infinity) {
        // b has date, a doesn't - b comes first
        return 1;
      }
      // Both are Infinity (no dates) - sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return NextResponse.json(sortedAgreements);
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

    // Get the template to copy its content
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { htmlContent: true }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
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
        customHtmlContent: template.htmlContent, // Copy template content to agreement
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
