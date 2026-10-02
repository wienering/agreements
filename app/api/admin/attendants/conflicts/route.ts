import { NextRequest, NextResponse } from 'next/server';
import {
  loadConflictAgreement,
  loadConflictBuffers,
  loadUpcomingAssignedAgreements,
} from '@/lib/attendants/conflictQuery';
import { conflictsForAssignment, findAttendantConflicts } from '@/lib/attendants/conflicts';
import { handleApiError } from '@/lib/handleApiError';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET                                   all upcoming double-bookings, keyed by agreement ID
 * GET ?agreementId=…&backdropLinkId=…   what assigning that link's attendant would clash with
 * Warn-only: nothing here blocks an assignment.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const params = request.nextUrl.searchParams;
    const agreementId = params.get('agreementId');
    const [buffers, upcoming] = await Promise.all([loadConflictBuffers(), loadUpcomingAssignedAgreements()]);

    if (agreementId) {
      const backdropLinkId = params.get('backdropLinkId');
      const candidate = await loadConflictAgreement(agreementId);
      if (!candidate) {
        return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
      }
      const link = backdropLinkId
        ? await prisma.backdropLink.findUnique({
            where: { id: backdropLinkId },
            select: { attendantId: true },
          })
        : null;
      const attendantId = link?.attendantId ?? null;
      return NextResponse.json(
        {
          buffers,
          attendantLinked: Boolean(attendantId),
          conflicts: conflictsForAssignment(candidate, attendantId, upcoming, buffers),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const conflicts = Object.fromEntries(findAttendantConflicts(upcoming, buffers));
    return NextResponse.json({ buffers, conflicts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, 'admin/attendants/conflicts', request.method);
  }
}
