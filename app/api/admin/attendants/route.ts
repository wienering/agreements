import { NextRequest, NextResponse } from 'next/server';
import { createAttendantSchema } from '@/lib/attendants/attendantInput';
import { CONFLICT_STATUSES } from '@/lib/attendants/conflicts';
import { handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const [attendants, usage] = await Promise.all([
      prisma.attendant.findMany({
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        include: { backdropLinks: { select: { id: true, name: true }, orderBy: { name: 'asc' } } },
      }),
      prisma.agreement.groupBy({
        by: ['backdropLinkId'],
        where: {
          backdropLinkId: { not: null },
          archived: false,
          cancelledAt: null,
          status: { in: [...CONFLICT_STATUSES] },
        },
        _count: { _all: true },
      }),
    ]);

    const activeByLink = new Map(usage.map((row) => [row.backdropLinkId, row._count._all]));
    return NextResponse.json({
      attendants: attendants.map((attendant) => ({
        ...attendant,
        activeAgreements: attendant.backdropLinks.reduce(
          (sum, link) => sum + (activeByLink.get(link.id) ?? 0),
          0,
        ),
      })),
    });
  } catch (error) {
    return handleApiError(error, 'admin/attendants', request.method);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const data = createAttendantSchema.parse(await request.json());

    const existing = await prisma.attendant.findUnique({ where: { externalId: data.externalId } });
    if (existing) {
      return NextResponse.json(
        { error: `An attendant with this ID already exists (${existing.name}).` },
        { status: 409 },
      );
    }

    const attendant = await prisma.attendant.create({
      data: { ...data, active: data.active ?? true },
    });
    return NextResponse.json({ attendant }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'admin/attendants', request.method);
  }
}
