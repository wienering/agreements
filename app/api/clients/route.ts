import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
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
      notes 
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    // Create client with all available fields
    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        notes: notes || null,
      },
    });

    // Try to update with event fields if they exist in database
    try {
      await prisma.$executeRaw`
        UPDATE "Client" 
        SET "eventType" = ${eventType || null},
            "eventLocation" = ${eventLocation || null},
            "eventStartTime" = ${eventStartTime || null},
            "eventDuration" = ${eventDuration || null},
            "eventPackage" = ${eventPackage || null}
        WHERE "id" = ${client.id}
      `;
      
      // Fetch updated client with event fields
      const updatedClient = await prisma.client.findUnique({
        where: { id: client.id }
      });
      
      return NextResponse.json(updatedClient, { status: 201 });
    } catch (error: any) {
      // If event fields don't exist, just return the basic client
      console.log('Event fields not available in database, returning basic client');
      return NextResponse.json(client, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
