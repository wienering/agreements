import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const eventUpdateSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
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
  unlimitedPrints: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const validatedData = eventUpdateSchema.parse(body);

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: validatedData.id },
      include: {
        agreements: {
          where: {
            status: 'SIGNED'
          }
        }
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if event has signed agreements - if so, we might want to prevent certain changes
    // For now, we'll allow updates but log a warning
    if (existingEvent.agreements.length > 0) {
      console.warn(`⚠️ Updating event ${validatedData.id} that has ${existingEvent.agreements.length} signed agreement(s)`);
    }

    const updatedEvent = await prisma.event.update({
      where: { id: validatedData.id },
      data: {
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : null,
        eventType: validatedData.eventType,
        eventLocation: validatedData.eventLocation,
        eventStartTime: validatedData.eventStartTime,
        eventDuration: validatedData.eventDuration,
        eventPackage: validatedData.eventPackage,
        packagePrice: validatedData.packagePrice ? parseFloat(validatedData.packagePrice.toString()) : null,
        notes: validatedData.notes,
        eventName: validatedData.eventName,
        eventPhone: validatedData.eventPhone,
        unlimitedPrints: validatedData.unlimitedPrints ?? false,
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error: any) {
    console.error('Event update error details:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

