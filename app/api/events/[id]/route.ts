import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveEventId } from '@/lib/events/booking';
import { EventPatchError, patchEventBooking } from '@/lib/events/patch';
import { formatZodDetails, handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

async function loadEventDetail(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, emailGreetingName: true },
      },
      backdropLink: {
        select: { id: true, name: true, url: true, attendantId: true, attendant: { select: { id: true, name: true, active: true } } },
      },
      agreements: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          archived: true,
          createdAt: true,
          signedAt: true,
          lastEmailedAt: true,
          emailSendCount: true,
          firstViewedAt: true,
          uniqueToken: true,
          template: { select: { title: true, internalTitle: true } },
        },
      },
      activities: { orderBy: { createdAt: 'desc' }, take: 30 },
      clientNotes: { orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, content: true, createdAt: true } },
      files: { select: { id: true, fileName: true, createdAt: true } },
    },
  });
}

/** One event with everything its drawer shows. Accepts an agreement id on the event too. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id: rawId } = await params;
    const id = await resolveEventId(rawId);
    const event = id ? await loadEventDetail(id) : null;
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json(event, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, 'events/[id]', request.method);
  }
}

/** Booking changes (payment, attendant, gallery, status...). Returns the updated event. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await patchEventBooking(id, await request.json());
    return NextResponse.json(await loadEventDetail(id));
  } catch (error) {
    if (error instanceof EventPatchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: formatZodDetails(error) }, { status: 400 });
    }
    return handleApiError(error, 'events/[id]', request.method);
  }
}
