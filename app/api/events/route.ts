import { queueCalendarSync } from '@/lib/googleCalendar/sync';
import { queueLeadBookingLink } from '@/lib/leads/linkBooking';
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

/** Every non-archived event with its client and agreements, for the Events page. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const events = await prisma.event.findMany({
      where: { archived: false },
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        clientId: true,
        eventDate: true,
        eventType: true,
        eventName: true,
        eventLocation: true,
        eventStartTime: true,
        eventDuration: true,
        eventPackage: true,
        packagePrice: true,
        eventPhone: true,
        notes: true,
        unlimitedPrints: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        nextAction: true,
        galleryEmailSentAt: true,
        backdropLink: { select: { id: true, name: true, attendant: { select: { name: true } } } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        agreements: {
          where: { archived: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            emailSendCount: true,
            lastEmailedAt: true,
            firstViewedAt: true,
            paymentStatus: true,
            template: { select: { title: true, internalTitle: true } },
          },
        },
      },
    });
    return NextResponse.json(events);
  } catch (error) {
    return handleApiError(error, 'events', request.method);
  }
}

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

    queueCalendarSync(event.id);
    queueLeadBookingLink(event.id);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'events', request.method);
  }
}




