import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agreementId: string }> }
) {
  try {

    await requireAdmin();
    const { agreementId } = await params;

    // Get agreement with event
    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        eventId: true,
        clientId: true,
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Get files for the client - include both event-specific files and general client files
    // This shows all files associated with the client, whether they're linked to an event or not
    const files = await prisma.clientFile.findMany({
      where: {
        clientId: agreement.clientId,
        // Show files that either:
        // 1. Match the agreement's eventId (if it exists), OR
        // 2. Have no eventId (general client files)
        OR: agreement.eventId
          ? [
              { eventId: agreement.eventId },
              { eventId: null },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        googleDriveLink: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Error fetching agreement files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

