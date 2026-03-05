import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const schema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: leadId } = await params;
    const body = await request.json();
    const { templateId } = schema.parse(body);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { client: true },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!lead.clientId) {
      return NextResponse.json({ error: 'Lead has no linked client' }, { status: 400 });
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { htmlContent: true },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    let eventId = lead.eventId;

    if (!eventId && (lead.eventDate || lead.eventType || lead.eventLocation)) {
      const event = await prisma.event.create({
        data: {
          clientId: lead.clientId,
          eventDate: lead.eventDate,
          eventType: lead.eventType,
          eventLocation: lead.eventLocation,
        },
      });
      eventId = event.id;
    }

    const uniqueToken = randomBytes(32).toString('hex');

    const agreement = await prisma.agreement.create({
      data: {
        clientId: lead.clientId,
        templateId,
        eventId,
        leadId,
        uniqueToken,
        status: 'DRAFT',
        customHtmlContent: template.htmlContent,
      },
      include: {
        client: true,
        template: true,
        event: true,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        stage: 'AGREEMENT_SENT',
        eventId,
        lastContactedAt: new Date(),
        contactCount: { increment: 1 },
      },
    });

    return NextResponse.json(agreement, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating agreement from lead:', error);
    return NextResponse.json({ error: 'Failed to create agreement' }, { status: 500 });
  }
}
