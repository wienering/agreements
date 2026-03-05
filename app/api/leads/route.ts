import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createLeadSchema = z.object({
  source: z.enum(['QUOTE', 'MANUAL']).default('QUOTE'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  eventDate: z.string().optional(),
  eventType: z.string().optional(),
  eventLocation: z.string().optional(),
  quotePackageHours: z.number().optional(),
  quoteTotal: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const source = searchParams.get('source');

    const where: Record<string, unknown> = {};
    if (stage) where.stage = stage;
    if (source) where.source = source;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        event: { select: { id: true, eventDate: true, eventType: true } },
        agreement: { select: { id: true, status: true, uniqueToken: true } },
      },
      orderBy: [
        { nextFollowUpAt: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createLeadSchema.parse(body);

    // Upsert client by email
    let client = await prisma.client.findUnique({
      where: { email: validated.email },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          email: validated.email,
          phone: validated.phone || null,
        },
      });
    } else {
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          phone: validated.phone !== undefined ? validated.phone : undefined,
        },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        source: validated.source as 'QUOTE' | 'MANUAL',
        stage: 'QUOTE_REQUESTED',
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone || null,
        eventDate: validated.eventDate ? new Date(validated.eventDate) : null,
        eventType: validated.eventType || null,
        eventLocation: validated.eventLocation || null,
        quotePackageHours: validated.quotePackageHours ?? null,
        quoteTotal: validated.quoteTotal != null ? validated.quoteTotal : null,
        notes: validated.notes || null,
        clientId: client.id,
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
