import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/handleApiError';
import {
  isValidAttendantCuid,
  backdropLinkUrlConditionsForAttendant,
  urlContainsBoundedAttendantId,
} from '@/lib/attendantIdentity';

async function getAgreementForAttendant(
  agreementId: string,
  attendantId: string
): Promise<{ id: string; clientId: string; eventId: string | null } | null> {
  const backdropLinks = await prisma.backdropLink.findMany({
    where: {
      OR: backdropLinkUrlConditionsForAttendant(attendantId),
    },
    select: { id: true, url: true },
  });

  const backdropLinkIds = backdropLinks
    .filter((link) => urlContainsBoundedAttendantId(link.url, attendantId))
    .map((link) => link.id);
  if (backdropLinkIds.length === 0) {
    return null;
  }

  return prisma.agreement.findFirst({
    where: {
      id: agreementId,
      backdropLinkId: { in: backdropLinkIds },
    },
    select: {
      id: true,
      clientId: true,
      eventId: true,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agreementId: string }> }
) {
  try {
    const { agreementId } = await params;
    const attendantId = request.nextUrl.searchParams.get('attendantId');

    let agreement: { id: string; clientId: string; eventId: string | null } | null;

    if (attendantId) {
      if (!isValidAttendantCuid(attendantId)) {
        return NextResponse.json(
          { error: 'Agreement not found' },
          { status: 404 }
        );
      }
      agreement = await getAgreementForAttendant(agreementId, attendantId);
      if (!agreement) {
        return NextResponse.json(
          { error: 'Agreement not found' },
          { status: 404 }
        );
      }
    } else {
      await requireAdmin(request);

      agreement = await prisma.agreement.findUnique({
        where: { id: agreementId },
        select: {
          id: true,
          clientId: true,
          eventId: true,
        },
      });

      if (!agreement) {
        return NextResponse.json(
          { error: 'Agreement not found' },
          { status: 404 }
        );
      }
    }

    const files = await prisma.clientFile.findMany({
      where: {
        clientId: agreement.clientId,
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
  } catch (error) {
    return handleApiError(error, 'files/agreement/[agreementId]');
  }
}
