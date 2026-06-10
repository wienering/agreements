import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

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
  unlimitedPrints: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
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
        unlimitedPrints: validatedData.unlimitedPrints ?? false,
        archived: false,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'events');
  }
}




