import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existing = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        archivedAt: null,
        archiveReason: null,
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error restoring lead:', error);
    return NextResponse.json({ error: 'Failed to restore lead' }, { status: 500 });
  }
}
