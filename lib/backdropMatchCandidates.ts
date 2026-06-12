import { prisma } from '@/lib/prisma';
import {
  backdropLinkUrlConditionsForAttendant,
  isValidAttendantCuid,
  urlContainsBoundedAttendantId,
} from '@/lib/attendantIdentity';
import { writableAgreementWhere } from '@/lib/backdropSelectionPersistence';

export type BackdropMatchCandidate = {
  id: string;
  clientName: string;
  eventDate: Date | null;
  selectedBackdropName: string | null;
};

export async function findBackdropMatchCandidates(params: {
  clientEmail: string;
  attendantId: string;
}): Promise<BackdropMatchCandidate[]> {
  const { clientEmail, attendantId } = params;

  if (!isValidAttendantCuid(attendantId)) {
    return [];
  }

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
    return [];
  }

  const agreements = await prisma.agreement.findMany({
    where: {
      archived: false,
      status: { not: 'CANCELLED' },
      backdropLinkId: { in: backdropLinkIds },
      client: {
        email: {
          equals: clientEmail.trim(),
          mode: 'insensitive',
        },
      },
    },
    select: {
      id: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          eventDate: true,
        },
      },
      event: {
        select: {
          eventDate: true,
        },
      },
    },
  });

  return agreements.map((agreement) => ({
    id: agreement.id,
    clientName: `${agreement.client.firstName} ${agreement.client.lastName}`.trim(),
    eventDate: agreement.event?.eventDate ?? agreement.client.eventDate ?? null,
    selectedBackdropName: null,
  }));
}

export async function findWritableBackdropMatchCandidate(
  agreementId: string,
): Promise<BackdropMatchCandidate | null> {
  const agreement = await prisma.agreement.findFirst({
    where: writableAgreementWhere(agreementId),
    select: {
      id: true,
      selectedBackdropName: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          eventDate: true,
        },
      },
      event: {
        select: {
          eventDate: true,
        },
      },
    },
  });

  if (!agreement) {
    return null;
  }

  return {
    id: agreement.id,
    clientName: `${agreement.client.firstName} ${agreement.client.lastName}`.trim(),
    eventDate: agreement.event?.eventDate ?? agreement.client.eventDate ?? null,
    selectedBackdropName: agreement.selectedBackdropName,
  };
}
