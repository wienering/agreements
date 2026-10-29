import { clientMatchesSearch } from '@/lib/clients/search';
import { getEmailGreeting } from '@/lib/email/greeting';
import { getMcpPrisma } from '@/lib/mcp/db';
import { assertNoForbiddenFields, labelClientProvidedText } from '@/lib/mcp/tools/sanitize';

const MAX_RESULTS = 10;

function upcomingEventDate(
  events: { eventDate: Date | null; archived: boolean }[],
  fallback: Date | null,
): string | null {
  const now = Date.now();
  const future = events
    .filter((event) => !event.archived && event.eventDate && event.eventDate.getTime() >= now)
    .sort((a, b) => (a.eventDate!.getTime() - b.eventDate!.getTime()));
  const pick = future[0]?.eventDate ?? fallback;
  return pick ? pick.toISOString() : null;
}

export async function searchClients(query: string) {
  const prisma = getMcpPrisma();
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailGreetingName: true,
      eventDate: true,
      events: {
        select: { eventDate: true, archived: true },
      },
    },
    take: 200,
    orderBy: { updatedAt: 'desc' },
  });

  const matched = clients
    .filter((client) =>
      clientMatchesSearch(
        {
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
        },
        query,
      ),
    )
    .slice(0, MAX_RESULTS)
    .map((client) => ({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`.trim(),
      email: client.email,
      company: null as string | null,
      greetingName: getEmailGreeting(client),
      upcomingEventDate: upcomingEventDate(client.events, client.eventDate),
    }));

  assertNoForbiddenFields(matched);
  return matched;
}

export async function getClient(id: string) {
  const prisma = getMcpPrisma();
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailGreetingName: true,
      phone: true,
      address: true,
      notes: true,
      eventDate: true,
      events: {
        where: { archived: false },
        select: {
          id: true,
          eventDate: true,
          eventType: true,
          eventLocation: true,
          eventStartTime: true,
          eventPackage: true,
          notes: true,
        },
        orderBy: { eventDate: 'asc' },
      },
    },
  });

  if (!client) return null;

  const result = {
    id: client.id,
    name: `${client.firstName} ${client.lastName}`.trim(),
    email: client.email,
    company: null as string | null,
    greetingName: getEmailGreeting(client),
    phone: client.phone,
    address: client.address,
    upcomingEventDate: upcomingEventDate(
      client.events.map((e) => ({ eventDate: e.eventDate, archived: false })),
      client.eventDate,
    ),
    events: client.events.map((event) => ({
      id: event.id,
      eventDate: event.eventDate?.toISOString() ?? null,
      eventType: event.eventType,
      venue: event.eventLocation,
      startTime: event.eventStartTime,
      package: event.eventPackage,
      ...(labelClientProvidedText(event.notes) ?? {}),
    })),
    ...(labelClientProvidedText(client.notes) ?? {}),
  };

  assertNoForbiddenFields(result);
  return result;
}
