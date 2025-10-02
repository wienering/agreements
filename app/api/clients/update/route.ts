import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const clientUpdateSchema = z.object({
  id: z.string().min(1, 'Client ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  eventDate: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  eventLocation: z.string().optional().nullable(),
  eventStartTime: z.string().optional().nullable(),
  eventDuration: z.string().optional().nullable(),
  eventPackage: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Client update request body:', body);
    
    const validatedData = clientUpdateSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Update client with basic fields first
    const updatedClient = await prisma.client.update({
      where: { id: validatedData.id },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : null,
        notes: validatedData.notes,
      },
    });

    // Try to update with event fields if they exist in database
    try {
      await prisma.$executeRaw`
        UPDATE "Client" 
        SET "eventType" = ${validatedData.eventType || null},
            "eventLocation" = ${validatedData.eventLocation || null},
            "eventStartTime" = ${validatedData.eventStartTime || null},
            "eventDuration" = ${validatedData.eventDuration || null},
            "eventPackage" = ${validatedData.eventPackage || null}
        WHERE "id" = ${validatedData.id}
      `;
      
      // Fetch updated client with event fields
      const finalClient = await prisma.client.findUnique({
        where: { id: validatedData.id }
      });
      
      console.log('Updated client with event fields:', finalClient);
      return NextResponse.json(finalClient);
    } catch (error: any) {
      // If event fields don't exist, just return the basic updated client
      console.log('Event fields not available in database, returning basic client');
      return NextResponse.json(updatedClient);
    }
  } catch (error: any) {
    console.error('Client update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
