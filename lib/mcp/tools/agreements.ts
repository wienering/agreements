import type { AgreementStatus, Prisma } from '@prisma/client';
import { getMcpPrisma } from '@/lib/mcp/db';
import { assertNoForbiddenFields, labelClientProvidedText } from '@/lib/mcp/tools/sanitize';
import { mcpDateTime } from '@/lib/mcp/tools/datetime';

const MAX_RESULTS = 10;

export type SearchAgreementsInput = {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: AgreementStatus;
};

function venueOf(agreement: {
  event: { eventLocation: string | null } | null;
  client: { eventLocation: string | null };
}): string | null {
  return agreement.event?.eventLocation ?? agreement.client.eventLocation ?? null;
}

function eventDateOf(agreement: {
  event: { eventDate: Date | null } | null;
  client: { eventDate: Date | null };
}): string | null {
  return mcpDateTime(agreement.event?.eventDate ?? agreement.client.eventDate);
}

export async function searchAgreements(input: SearchAgreementsInput) {
  const prisma = getMcpPrisma();
  const where: Prisma.AgreementWhereInput = {
    archived: false,
  };

  if (input.status) {
    where.status = input.status;
  }

  if (input.dateFrom || input.dateTo) {
    where.OR = [
      {
        event: {
          eventDate: {
            ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
            ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
          },
        },
      },
      {
        eventId: null,
        client: {
          eventDate: {
            ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
            ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
          },
        },
      },
    ];
  }

  const rows = await prisma.agreement.findMany({
    where,
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      client: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          eventDate: true,
          eventLocation: true,
        },
      },
      event: {
        select: {
          eventDate: true,
          eventLocation: true,
          eventName: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const query = input.query?.trim().toLowerCase();
  const filtered = query
    ? rows.filter((row) => {
        const name = `${row.client.firstName} ${row.client.lastName}`.toLowerCase();
        const venue = (venueOf(row) || '').toLowerCase();
        const email = row.client.email.toLowerCase();
        const eventName = (row.event?.eventName || '').toLowerCase();
        return (
          name.includes(query) ||
          venue.includes(query) ||
          email.includes(query) ||
          eventName.includes(query) ||
          row.id.toLowerCase().includes(query)
        );
      })
    : rows;

  const results = filtered.slice(0, MAX_RESULTS).map((row) => ({
    id: row.id,
    clientName: `${row.client.firstName} ${row.client.lastName}`.trim(),
    eventDate: eventDateOf(row),
    venue: venueOf(row),
    status: row.status,
    paymentStatus: row.paymentStatus,
  }));

  assertNoForbiddenFields(results);
  return results;
}

export async function getAgreement(id: string) {
  const prisma = getMcpPrisma();
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      expiresAt: true,
      signedAt: true,
      nextAction: true,
      archived: true,
      selectedBackdropName: true,
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          eventDate: true,
          eventLocation: true,
          notes: true,
        },
      },
      event: {
        select: {
          id: true,
          eventDate: true,
          eventLocation: true,
          eventStartTime: true,
          eventDuration: true,
          eventPackage: true,
          eventName: true,
          notes: true,
        },
      },
      template: {
        select: {
          id: true,
          title: true,
          internalTitle: true,
        },
      },
    },
  });

  if (!agreement) return null;

  const result = {
    id: agreement.id,
    status: agreement.status,
    paymentStatus: agreement.paymentStatus,
    expiresAt: mcpDateTime(agreement.expiresAt),
    signedAt: mcpDateTime(agreement.signedAt),
    nextAction: agreement.nextAction,
    archived: agreement.archived,
    selectedBackdropName: agreement.selectedBackdropName,
    client: {
      id: agreement.client.id,
      name: `${agreement.client.firstName} ${agreement.client.lastName}`.trim(),
      email: agreement.client.email,
      phone: agreement.client.phone,
      ...(labelClientProvidedText(agreement.client.notes) ?? {}),
    },
    event: agreement.event
      ? {
          id: agreement.event.id,
          eventDate: mcpDateTime(agreement.event.eventDate),
          venue: agreement.event.eventLocation,
          startTime: agreement.event.eventStartTime,
          duration: agreement.event.eventDuration,
          package: agreement.event.eventPackage,
          eventName: agreement.event.eventName,
          ...(labelClientProvidedText(agreement.event.notes) ?? {}),
        }
      : {
          eventDate: mcpDateTime(agreement.client.eventDate),
          venue: agreement.client.eventLocation,
        },
    template: {
      id: agreement.template.id,
      title: agreement.template.title,
      internalTitle: agreement.template.internalTitle,
    },
  };

  assertNoForbiddenFields(result);
  return result;
}
