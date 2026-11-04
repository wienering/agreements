import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logEventActivity } from '@/lib/events/booking';
import { buildLinkEmail } from '@/lib/events/linkEmail';
import { sendEmail } from '@/lib/email/send';
import { handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const bodySchema = z.object({ kind: z.enum(['payment', 'receipt']), preview: z.boolean().optional() });

/** Email the client the event's payment or receipt link. `preview: true` returns the email without sending. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const { kind, preview } = bodySchema.parse(await request.json());
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        eventDate: true,
        stripePaymentLink: true,
        stripeReceiptLink: true,
        client: { select: { email: true, firstName: true, emailGreetingName: true } },
      },
    });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const url = kind === 'payment' ? event.stripePaymentLink : event.stripeReceiptLink;
    if (!url) return NextResponse.json({ error: `Add a ${kind} link first` }, { status: 400 });

    const email = buildLinkEmail({ kind, url, client: event.client, eventDate: event.eventDate });
    if (preview) return NextResponse.json({ to: event.client.email, subject: email.subject, html: email.html });

    await sendEmail({ to: event.client.email, subject: email.subject, html: email.html, text: email.text });
    await logEventActivity(id, 'NOTE_ADDED', { sent: `${kind} link`, recipient: event.client.email });
    return NextResponse.json({ success: true, to: event.client.email });
  } catch (error) {
    return handleApiError(error, 'events/[id]/send-link', request.method);
  }
}
