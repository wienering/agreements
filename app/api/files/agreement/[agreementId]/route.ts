import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agreementId: string }> }
) {
  try {
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

    // Get files for the event if it exists, otherwise get files for the client
    let files;
    if (agreement.eventId) {
      files = await prisma.clientFile.findMany({
        where: { eventId: agreement.eventId },
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
    } else {
      // Fallback to client files if no event
      files = await prisma.clientFile.findMany({
        where: { clientId: agreement.clientId },
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
    }

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Error fetching agreement files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

