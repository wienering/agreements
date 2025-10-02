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

    const updatedClient = await prisma.client.update({
      where: { id: validatedData.id },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : null,
        // TODO: Uncomment after database migration
        // eventType: validatedData.eventType,
        // eventLocation: validatedData.eventLocation,
        // eventStartTime: validatedData.eventStartTime,
        // eventDuration: validatedData.eventDuration,
        // eventPackage: validatedData.eventPackage,
        notes: validatedData.notes,
      },
    });

    console.log('Updated client:', updatedClient);
    return NextResponse.json(updatedClient);
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
