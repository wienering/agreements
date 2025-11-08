import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const eventCreateSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  eventDate: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  eventLocation: z.string().optional().nullable(),
  eventStartTime: z.string().optional().nullable(),
  eventDuration: z.string().optional().nullable(),
  eventPackage: z.string().optional().nullable(),
  packagePrice: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  eventName: z.string().optional().nullable(),
  eventPhone: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = eventCreateSchema.parse(body);

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        clientId: validatedData.clientId,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : null,
        eventType: validatedData.eventType || null,
        eventLocation: validatedData.eventLocation || null,
        eventStartTime: validatedData.eventStartTime || null,
        eventDuration: validatedData.eventDuration || null,
        eventPackage: validatedData.eventPackage || null,
        packagePrice: validatedData.packagePrice ? parseFloat(validatedData.packagePrice.toString()) : null,
        notes: validatedData.notes || null,
        eventName: validatedData.eventName || null,
        eventPhone: validatedData.eventPhone || null,
        archived: false,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Event creation error details:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

