import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateLeadSchema = z.object({
  stage: z.enum(['QUOTE_REQUESTED', 'QUOTE_SENT', 'AGREEMENT_SENT', 'SIGNED', 'COMPLETED', 'LOST']).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  eventDate: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  eventLocation: z.string().optional().nullable(),
  quotePackageHours: z.number().optional().nullable(),
  quoteTotal: z.number().optional().nullable(),
  lastContactedAt: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    await requireAdmin();
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        client: true,
        event: true,
        agreement: {
          include: {
            template: { select: { title: true } },
            client: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validated = updateLeadSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.stage !== undefined) updateData.stage = validated.stage;
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName;
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName;
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.eventDate !== undefined) updateData.eventDate = validated.eventDate ? new Date(validated.eventDate) : null;
    if (validated.eventType !== undefined) updateData.eventType = validated.eventType;
    if (validated.eventLocation !== undefined) updateData.eventLocation = validated.eventLocation;
    if (validated.quotePackageHours !== undefined) updateData.quotePackageHours = validated.quotePackageHours;
    if (validated.quoteTotal !== undefined) updateData.quoteTotal = validated.quoteTotal;
    if (validated.lastContactedAt !== undefined) updateData.lastContactedAt = validated.lastContactedAt ? new Date(validated.lastContactedAt) : null;
    if (validated.nextFollowUpAt !== undefined) updateData.nextFollowUpAt = validated.nextFollowUpAt ? new Date(validated.nextFollowUpAt) : null;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    if (validated.clientId !== undefined) updateData.clientId = validated.clientId;
    if (validated.eventId !== undefined) updateData.eventId = validated.eventId;

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        event: { select: { id: true, eventDate: true } },
        agreement: { select: { id: true, status: true } },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    await requireAdmin();
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Lead deleted' });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
