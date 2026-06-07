import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const contactedSchema = z.object({
  nextFollowUpAt: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validated = contactedSchema.parse(body);

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        lastContactedAt: new Date(),
        contactCount: { increment: 1 },
        nextFollowUpAt: validated.nextFollowUpAt ? new Date(validated.nextFollowUpAt) : undefined,
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error recording contact:', error);
    return NextResponse.json({ error: 'Failed to record contact' }, { status: 500 });
  }
}
