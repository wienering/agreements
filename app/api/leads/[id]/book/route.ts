import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';
import { handleApiError } from '@/lib/handleApiError';
import { normalizeEventDateToNoonUtc, parseTorontoCalendarDateKey } from '@/lib/dates';
import { queueCalendarSync } from '@/lib/googleCalendar/sync';
import { setLeadStatus } from '@/lib/leads/setStatus';

/**
 * Mark booked: the lead becomes a client plus an Upcoming event.
 * An existing client with the same email is linked and left as is (only a missing phone is filled in).
 * The lead is set to Booked, which also marks its Sheet row "booked" so WF2 stops.
 */

const blank = z.string().trim().optional().nullable().transform((v) => v || null);

const bookSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().default(''),
  email: z.string().trim().toLowerCase().pipe(z.string().email('Valid email is required')),
  phone: blank,
  eventDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date is required (YYYY-MM-DD)'),
  eventStartTime: blank,
  eventDuration: blank,
  eventLocation: blank,
  eventName: blank,
  eventPackage: blank,
  packagePrice: z.union([z.number(), z.string()]).optional().nullable().transform((v) => {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }),
  notes: blank,
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const input = bookSchema.parse(await request.json());

    const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true, status: true, eventId: true } });
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    if (lead.status === 'BOOKED' && lead.eventId) {
      return NextResponse.json({ error: 'This lead is already booked', eventId: lead.eventId }, { status: 409 });
    }

    const day = parseTorontoCalendarDateKey(input.eventDate);
    if (!day) return NextResponse.json({ error: 'Invalid event date' }, { status: 400 });

    const { clientId, eventId, clientCreated } = await prisma.$transaction(async (tx) => {
      let client = await tx.client.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' } },
        select: { id: true, phone: true },
      });
      let created = false;
      if (!client) {
        client = await tx.client.create({
          data: { firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone },
          select: { id: true, phone: true },
        });
        created = true;
      } else if (!client.phone && input.phone) {
        await tx.client.update({ where: { id: client.id }, data: { phone: input.phone } });
      }

      const event = await tx.event.create({
        data: {
          clientId: client.id,
          eventDate: normalizeEventDateToNoonUtc(day),
          eventStartTime: input.eventStartTime,
          eventDuration: input.eventDuration,
          eventLocation: input.eventLocation,
          eventName: input.eventName,
          eventPackage: input.eventPackage,
          packagePrice: input.packagePrice,
          notes: input.notes,
          archived: false,
        },
        select: { id: true },
      });

      await tx.lead.update({ where: { id: lead.id }, data: { clientId: client.id, eventId: event.id } });
      return { clientId: client.id, eventId: event.id, clientCreated: created };
    });

    await setLeadStatus({
      leadId: lead.id,
      status: 'BOOKED',
      source: 'admin',
      note: clientCreated ? 'New client and event created' : 'Event added to existing client',
      syncSheet: true,
    });
    queueCalendarSync(eventId);

    return NextResponse.json({ ok: true, clientId, eventId, clientCreated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'leads/book', request.method);
  }
}
