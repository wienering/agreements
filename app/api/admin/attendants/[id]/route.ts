import { NextRequest, NextResponse } from 'next/server';
import { updateAttendantSchema } from '@/lib/attendants/attendantInput';
import { handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

/** Edit an attendant. There's no delete: deactivate instead, so past bookings keep their name. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const data = updateAttendantSchema.parse(await request.json());

    const existing = await prisma.attendant.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Attendant not found' }, { status: 404 });
    }

    const attendant = await prisma.attendant.update({ where: { id }, data });
    return NextResponse.json({ attendant });
  } catch (error) {
    return handleApiError(error, 'admin/attendants/[id]', request.method);
  }
}
