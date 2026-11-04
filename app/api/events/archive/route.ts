import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import { setEventArchived } from '@/lib/events/archive';

const archiveEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = archiveEventSchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: validatedData.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Archiving an event archives its agreements with it.
    await setEventArchived(event.id, true);
    const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });

    return NextResponse.json({
      message: 'Event archived successfully',
      event: updatedEvent
    });
  } catch (error) {
    return handleApiError(error, 'events/archive', request.method);
  }
}

export async function DELETE(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = archiveEventSchema.parse(body);

    const event = await prisma.event.findUnique({
      where: { id: validatedData.eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await setEventArchived(event.id, false);
    const updatedEvent = await prisma.event.findUnique({ where: { id: event.id } });

    return NextResponse.json({
      message: 'Event unarchived successfully',
      event: updatedEvent
    });
  } catch (error) {
    return handleApiError(error, 'events/archive', request.method);
  }
}

