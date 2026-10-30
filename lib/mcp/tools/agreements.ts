import type { AgreementStatus, Prisma } from '@prisma/client';
import { getMcpPrisma } from '@/lib/mcp/db';
import { assertNoForbiddenFields, labelClientProvidedText } from '@/lib/mcp/tools/sanitize';
import { mcpCalendarDate, mcpDateTime, mcpEndTime, mcpPrice } from '@/lib/mcp/tools/datetime';

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
  return mcpCalendarDate(agreement.event?.eventDate ?? agreement.client.eventDate);
}

function startTimeOf(agreement: {
  event: { eventStartTime: string | null } | null;
  client: { eventStartTime: string | null };
}): string | null {
  return agreement.event?.eventStartTime ?? agreement.client.eventStartTime ?? null;
}

function durationOf(agreement: {
  event: { eventDuration: string | null } | null;
  client: { eventDuration: string | null };
}): string | null {
  return agreement.event?.eventDuration ?? agreement.client.eventDuration ?? null;
}

type PriceValue = { toString(): string } | number | null;

function packagePriceOf(agreement: {
  event: { packagePrice: PriceValue } | null;
  client: { packagePrice: PriceValue };
}): number | null {
  return mcpPrice(agreement.event?.packagePrice ?? agreement.client.packagePrice);
}

function attendantNamesOf(agreement: {
  backdropLink: { attendant: { name: string } | null } | null;
}): string[] {
  const name = agreement.backdropLink?.attendant?.name?.trim();
  return name ? [name] : [];
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
          eventStartTime: true,
          eventDuration: true,
          packagePrice: true,
        },
      },
      event: {
        select: {
          eventDate: true,
          eventLocation: true,
          eventName: true,
          eventStartTime: true,
          eventDuration: true,
          packagePrice: true,
        },
      },
      backdropLink: {
        select: {
          attendant: { select: { name: true } },
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
    startTime: startTimeOf(row),
    duration: durationOf(row),
    endTime: mcpEndTime(startTimeOf(row), durationOf(row)),
    packagePrice: packagePriceOf(row),
    venue: venueOf(row),
    status: row.status,
    paymentStatus: row.paymentStatus,
    attendants: attendantNamesOf(row),
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
          eventStartTime: true,
          eventDuration: true,
          packagePrice: true,
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
          packagePrice: true,
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
      backdropLink: {
        select: {
          attendant: { select: { name: true } },
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
    attendants: attendantNamesOf(agreement),
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
          eventDate: mcpCalendarDate(agreement.event.eventDate),
          venue: agreement.event.eventLocation,
          startTime: agreement.event.eventStartTime,
          duration: agreement.event.eventDuration,
          endTime: mcpEndTime(agreement.event.eventStartTime, agreement.event.eventDuration),
          package: agreement.event.eventPackage,
          packagePrice: mcpPrice(agreement.event.packagePrice),
          eventName: agreement.event.eventName,
          ...(labelClientProvidedText(agreement.event.notes) ?? {}),
        }
      : {
          eventDate: mcpCalendarDate(agreement.client.eventDate),
          venue: agreement.client.eventLocation,
          startTime: agreement.client.eventStartTime,
          duration: agreement.client.eventDuration,
          endTime: mcpEndTime(agreement.client.eventStartTime, agreement.client.eventDuration),
          packagePrice: mcpPrice(agreement.client.packagePrice),
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
