import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        events: {
          where: {
            archived: false
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      eventDate, 
      eventType,
      eventLocation,
      eventStartTime,
      eventDuration,
      eventPackage,
      packagePrice,
      notes 
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    // Check if client exists by email
    let client = await prisma.client.findUnique({
      where: { email }
    });

    // If client doesn't exist, create new client
    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          notes: notes || null,
        },
      });
    } else {
      // Update client info if provided (but don't update event fields - those go to Event model)
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          firstName,
          lastName,
          phone: phone !== undefined ? phone : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });
    }

    // Create Event record for this booking
    // Only create if there's event data provided
    if (eventDate || eventType || eventLocation || eventStartTime || eventDuration || eventPackage || packagePrice) {
      await prisma.event.create({
        data: {
          clientId: client.id,
          eventDate: eventDate ? new Date(eventDate) : null,
          eventType: eventType || null,
          eventLocation: eventLocation || null,
          eventStartTime: eventStartTime || null,
          eventDuration: eventDuration || null,
          eventPackage: eventPackage || null,
          packagePrice: packagePrice ? parseFloat(packagePrice) : null,
          notes: notes || null,
          archived: false,
        },
      });
    }

    // Fetch client with events included
    const clientWithEvents = await prisma.client.findUnique({
      where: { id: client.id },
      include: {
        events: {
          where: {
            archived: false
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json(clientWithEvents, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    // Handle unique constraint error specifically
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A client with this email already exists. The event has been added to the existing client.' 
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
