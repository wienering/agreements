import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/handleApiError';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        lastEmailedAt: true,
        emailSendCount: true,
        firstViewedAt: true,
        lastViewedAt: true,
        signedAt: true,
        cancelledAt: true,
        reminderCount: true,
        lastReminderAt: true,
        chaserPaused: true,
        activities: {
          select: {
            id: true,
            type: true,
            meta: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    const { activities, ...legacyFields } = agreement;

    return NextResponse.json({
      success: true,
      activities,
      legacy: {
        status: legacyFields.status,
        lastEmailedAt: legacyFields.lastEmailedAt,
        emailSendCount: legacyFields.emailSendCount,
        firstViewedAt: legacyFields.firstViewedAt,
        lastViewedAt: legacyFields.lastViewedAt,
        signedAt: legacyFields.signedAt,
        cancelledAt: legacyFields.cancelledAt,
        reminderCount: legacyFields.reminderCount,
        lastReminderAt: legacyFields.lastReminderAt,
        chaserPaused: legacyFields.chaserPaused,
      },
    });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    return handleApiError(error, 'agreements/[id]/activity', request.method);
  }
}
