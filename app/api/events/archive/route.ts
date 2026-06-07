import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const archiveEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const validatedData = archiveEventSchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: validatedData.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Event archived successfully',
      event: updatedEvent
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error archiving event:', error);
    return NextResponse.json({ 
      error: 'Failed to archive event' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const validatedData = archiveEventSchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: validatedData.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        archived: false,
        archivedAt: null,
      },
    });

    return NextResponse.json({
      message: 'Event unarchived successfully',
      event: updatedEvent
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error unarchiving event:', error);
    return NextResponse.json({ 
      error: 'Failed to unarchive event' 
    }, { status: 500 });
  }
}

