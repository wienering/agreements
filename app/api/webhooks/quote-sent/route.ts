import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const quoteSentSchema = z.object({
  email: z.string().email('Valid email is required'),
  source: z.string().optional(),
});

/**
 * When the website sends a quote to the client, it calls this webhook
 * to update the lead from QUOTE_REQUESTED → QUOTE_SENT.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.QUOTE_WEBHOOK_SECRET;
    if (secret) {
      const receivedSecret = request.headers.get('x-quote-webhook-secret');
      if (receivedSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const validated = quoteSentSchema.parse(body);

    // Find most recent QUOTE_REQUESTED lead for this email
    const lead = await prisma.lead.findFirst({
      where: {
        email: validated.email,
        stage: 'QUOTE_REQUESTED',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lead) {
      return NextResponse.json({ success: true, updated: false, message: 'No matching lead found' });
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stage: 'QUOTE_SENT',
        notes: lead.notes
          ? `${lead.notes}\nQuote sent to client (${validated.source || 'website'})`
          : `Quote sent to client (${validated.source || 'website'})`,
      },
    });

    return NextResponse.json({ success: true, updated: true, leadId: lead.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Quote sent webhook error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
