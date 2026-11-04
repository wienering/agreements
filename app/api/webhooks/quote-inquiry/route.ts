import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const quoteInquirySchema = z.object({
  contactInfo: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    eventDate: z.string().optional(),
  }),
  source: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Optional: verify webhook secret
    const secret = process.env.QUOTE_WEBHOOK_SECRET;
    if (secret) {
      const receivedSecret = request.headers.get('x-quote-webhook-secret');
      if (receivedSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const validated = quoteInquirySchema.parse(body);

    const { name, email, phone, eventDate } = validated.contactInfo;
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Parse eventDate - may be "December 25, 2025" or "2025-12-25"
    // Use noon UTC so the calendar date displays correctly in America/Toronto and other timezones
    let parsedEventDate: Date | null = null;
    if (eventDate) {
      const d = new Date(eventDate);
      if (!isNaN(d.getTime())) {
        parsedEventDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
      }
    }

    // Leads no longer create or edit Clients: a client is created when the lead is marked booked
    // (so form entries can't rename an existing client or fill the client list with non-bookings).

    // Create lead (avoid duplicate for same email within last 5 min)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingLead = await prisma.lead.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (existingLead) {
      return NextResponse.json({ success: true, leadId: existingLead.id, duplicate: true });
    }

    const lead = await prisma.lead.create({
      data: {
        source: 'QUOTE',
        stage: 'QUOTE_REQUESTED',
        firstName,
        lastName,
        email,
        phone: phone || null,
        eventDate: parsedEventDate,
        notes: `From website quote form (${validated.source || 'quote_tool_contact_form'})`,
        activities: {
          create: { kind: 'CREATED', summary: 'Came in from the quote tool', source: 'website' },
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, leadId: lead.id });
  } catch (error) {
    return handleApiError(error, 'webhooks/quote-inquiry', request.method);
  }
}
