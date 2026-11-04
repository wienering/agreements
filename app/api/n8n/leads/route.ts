import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/handleApiError';
import { verifyN8nSecret } from '@/lib/n8nAuth';
import { leadSourceFromPage, parseHours, parseLooseEventDate, splitName } from '@/lib/leads/intake';

/**
 * Lead intake from WF1 ("Pre-Booking Leads"), called right after the Sheet row is added.
 * Creates the lead with the Sheet's lead_id. Never creates or edits a Client; that happens on Mark booked.
 * Safe to call twice: the same lead_id returns the existing lead, and a lead with the same email from
 * the last 5 minutes (e.g. the quote page's direct call) is linked instead of duplicated.
 */

const text = z.union([z.string(), z.number()]).optional().nullable().transform((v) => (v == null ? '' : String(v).trim()));

const intakeSchema = z.object({
  sheetLeadId: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1)),
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  firstName: text,
  lastName: text,
  fullName: text,
  phone: text,
  eventDate: text,
  city: text,
  hours: text,
  utmSource: text,
  pageUrl: text,
});

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!verifyN8nSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const input = intakeSchema.parse(await request.json());

    const existing = await prisma.lead.findUnique({ where: { sheetLeadId: input.sheetLeadId }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ ok: true, leadId: existing.id, duplicate: true });
    }

    const { firstName, lastName } = splitName(input.firstName, input.lastName, input.fullName);
    const eventDate = parseLooseEventDate(input.eventDate);
    const source = leadSourceFromPage(input.pageUrl);
    const details = [
      input.eventDate && !eventDate ? `Event date as typed: ${input.eventDate}` : '',
      input.utmSource ? `Source: ${input.utmSource}` : '',
      input.pageUrl ? `Form page: ${input.pageUrl}` : '',
    ].filter(Boolean);

    const recent = await prisma.lead.findFirst({
      where: {
        email: { equals: input.email, mode: 'insensitive' },
        sheetLeadId: null,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, phone: true, eventDate: true, eventLocation: true, quotePackageHours: true },
    });

    if (recent) {
      await prisma.lead.update({
        where: { id: recent.id },
        data: {
          sheetLeadId: input.sheetLeadId,
          source,
          phone: recent.phone ?? (input.phone || null),
          eventDate: recent.eventDate ?? eventDate,
          eventLocation: recent.eventLocation ?? (input.city || null),
          quotePackageHours: recent.quotePackageHours ?? parseHours(input.hours),
        },
      });
      return NextResponse.json({ ok: true, leadId: recent.id, linked: true });
    }

    const lead = await prisma.lead.create({
      data: {
        source,
        stage: 'QUOTE_REQUESTED',
        status: 'NEW',
        sheetLeadId: input.sheetLeadId,
        firstName: firstName || input.email,
        lastName,
        email: input.email,
        phone: input.phone || null,
        eventDate,
        eventLocation: input.city || null,
        quotePackageHours: parseHours(input.hours),
        notes: details.length ? details.join('\n') : null,
        activities: {
          create: {
            kind: 'CREATED',
            summary: source === 'QUOTE' ? 'Came in from the quote tool' : 'Came in from the booking form (not finished)',
            source: 'n8n',
          },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'n8n/leads', request.method);
  }
}
