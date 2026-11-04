import { queueCalendarSync } from '@/lib/googleCalendar/sync';
import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { requireMcpWriteScope } from '@/lib/mcp/authContext';
import { MCP_ACTOR } from '@/lib/mcp/config';
import { getMcpPrisma } from '@/lib/mcp/db';
import { logMcpAgreementActivity } from '@/lib/mcp/audit';
import { assertNoForbiddenFields, labelClientProvidedText } from '@/lib/mcp/tools/sanitize';
import { mcpCalendarDate, mcpEndTime, mcpPrice } from '@/lib/mcp/tools/datetime';
import { logEventActivity, resolveEventId } from '@/lib/events/booking';
import { setEventStatus } from '@/lib/events/status';
import { setEventArchived } from '@/lib/events/archive';
import { normalizePaymentStatus, PAYMENT_STATUSES, DEFAULT_PAYMENT_STATUS } from '@/lib/paymentStatus';
import { addTorontoCalendarDaysFrom, fromTorontoDateTimeLocalInput, normalizeEventDateToNoonUtc, parseTorontoCalendarDateKey } from '@/lib/dates';
import { conflictsForAssignment, type AttendantConflict } from '@/lib/attendants/conflicts';
import { loadConflictAgreement, loadConflictBuffers, loadUpcomingAssignedAgreements } from '@/lib/attendants/conflictQuery';

/**
 * Connector tools for events. The event is the booking: date, venue, package, payment,
 * attendant and status. An agreement is optional and always belongs to an event.
 */

const MAX_RESULTS = 20;
const EVENT_STATUSES = ['UPCOMING', 'COMPLETED', 'CANCELLED'] as const;
type EventStatus = (typeof EVENT_STATUSES)[number];

export type EventFields = {
  eventDate?: string | null;
  startTime?: string | null;
  duration?: string | null;
  eventType?: string | null;
  eventName?: string | null;
  venue?: string | null;
  package?: string | null;
  price?: string | number | null;
  phone?: string | null;
  notes?: string | null;
  paymentStatus?: string;
  nextAction?: string | null;
  attendantName?: string | null;
  status?: EventStatus;
  cancellationReason?: string | null;
  galleryLinks?: Array<{ title?: string; url: string }>;
  selectedBackdropName?: string | null;
  showPhoneNumberAlways?: boolean;
  forceVirtualGreenScreen?: boolean;
  followUpsPaused?: boolean;
  reviewReceived?: boolean;
  archived?: boolean;
};

function parseEventDateInput(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = parseTorontoCalendarDateKey(value);
    if (!parsed) throw new Error('Invalid event date');
    return normalizeEventDateToNoonUtc(parsed);
  }
  if (value.includes('T') && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    const d = fromTorontoDateTimeLocalInput(value.slice(0, 16));
    if (Number.isNaN(d.getTime())) throw new Error('Invalid event date');
    return normalizeEventDateToNoonUtc(d);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid event date');
  return normalizeEventDateToNoonUtc(d);
}

const eventSummarySelect = {
  id: true,
  status: true,
  archived: true,
  eventDate: true,
  eventType: true,
  eventName: true,
  eventLocation: true,
  eventStartTime: true,
  eventDuration: true,
  eventPackage: true,
  packagePrice: true,
  eventPhone: true,
  notes: true,
  paymentStatus: true,
  nextAction: true,
  selectedBackdropName: true,
  galleryLinks: true,
  galleryEmailSentAt: true,
  reviewRequestSentAt: true,
  cancellationReason: true,
  showPhoneNumberAlways: true,
  forceVirtualGreenScreen: true,
  followUpsPaused: true,
  reviewReceived: true,
  stripePaymentLink: true,
  client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  backdropLink: { select: { name: true, attendant: { select: { name: true } } } },
  agreements: {
    where: { archived: false },
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, status: true, signedAt: true, template: { select: { title: true, internalTitle: true } } },
  },
} satisfies Prisma.EventSelect;

type EventRow = Prisma.EventGetPayload<{ select: typeof eventSummarySelect }>;

function summarize(event: EventRow) {
  const result = {
    id: event.id,
    status: event.status,
    archived: event.archived,
    eventDate: mcpCalendarDate(event.eventDate),
    eventType: event.eventType,
    eventName: event.eventName,
    venue: event.eventLocation,
    startTime: event.eventStartTime,
    duration: event.eventDuration,
    endTime: mcpEndTime(event.eventStartTime, event.eventDuration),
    package: event.eventPackage,
    packagePrice: mcpPrice(event.packagePrice),
    dayOfPhone: event.eventPhone,
    paymentStatus: event.paymentStatus,
    nextAction: event.nextAction,
    attendant: event.backdropLink?.attendant?.name ?? event.backdropLink?.name ?? null,
    selectedBackdropName: event.selectedBackdropName,
    galleryLinks: Array.isArray(event.galleryLinks) ? event.galleryLinks : [],
    galleryEmailSent: Boolean(event.galleryEmailSentAt),
    reviewRequestSent: Boolean(event.reviewRequestSentAt),
    showPhoneNumberAlways: event.showPhoneNumberAlways,
    forceVirtualGreenScreen: event.forceVirtualGreenScreen,
    followUpsPaused: event.followUpsPaused,
    reviewReceived: event.reviewReceived,
    stripePaymentLink: event.stripePaymentLink,
    cancellationReason: event.cancellationReason,
    client: {
      id: event.client.id,
      name: `${event.client.firstName} ${event.client.lastName}`.trim(),
      email: event.client.email,
      phone: event.client.phone,
    },
    agreements: event.agreements.map((agreement) => ({
      id: agreement.id,
      status: agreement.status,
      template: agreement.template.internalTitle || agreement.template.title,
      signed: Boolean(agreement.signedAt),
    })),
    ...(labelClientProvidedText(event.notes) ?? {}),
  };
  assertNoForbiddenFields(result);
  return result;
}

export async function searchEvents(input: { query?: string; dateFrom?: string; dateTo?: string; status?: EventStatus; includeArchived?: boolean }) {
  const prisma = getMcpPrisma();
  const where: Prisma.EventWhereInput = {};
  if (!input.includeArchived) where.archived = false;
  if (input.status) where.status = input.status;
  const from = input.dateFrom ? parseEventDateInput(input.dateFrom) : input.query ? undefined : addTorontoCalendarDaysFrom(new Date(), -1);
  const to = input.dateTo ? addTorontoCalendarDaysFrom(parseEventDateInput(input.dateTo), 1) : undefined;
  if (from || to) where.eventDate = { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
  const query = input.query?.trim();
  if (query) {
    const words = query.split(/\s+/).filter(Boolean);
    where.AND = words.map((word) => ({
      OR: [
        { client: { firstName: { contains: word, mode: 'insensitive' as const } } },
        { client: { lastName: { contains: word, mode: 'insensitive' as const } } },
        { client: { email: { contains: word, mode: 'insensitive' as const } } },
        { eventName: { contains: word, mode: 'insensitive' as const } },
        { eventLocation: { contains: word, mode: 'insensitive' as const } },
        { eventType: { contains: word, mode: 'insensitive' as const } },
      ],
    }));
  }
  const events = await prisma.event.findMany({
    where,
    orderBy: { eventDate: 'asc' },
    take: MAX_RESULTS,
    select: eventSummarySelect,
  });
  return { events: events.map(summarize), limit: MAX_RESULTS };
}

export async function getEvent(id: string) {
  const prisma = getMcpPrisma();
  const eventId = await resolveEventId(id);
  if (!eventId) return null;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: eventSummarySelect });
  return event ? summarize(event) : null;
}

async function attendantWarnings(eventId: string): Promise<AttendantConflict[]> {
  const candidate = await loadConflictAgreement(eventId);
  if (!candidate?.attendantId) return [];
  const [others, buffers] = await Promise.all([loadUpcomingAssignedAgreements(), loadConflictBuffers()]);
  return conflictsForAssignment(candidate, candidate.attendantId, others, buffers);
}

/** Event fields → Prisma data. Returns an error string for bad input. */
async function eventDataFrom(fields: EventFields): Promise<{ data: Prisma.EventUncheckedUpdateInput } | { error: string }> {
  const prisma = getMcpPrisma();
  const data: Prisma.EventUncheckedUpdateInput = {};
  if (fields.eventDate !== undefined) data.eventDate = fields.eventDate ? parseEventDateInput(fields.eventDate) : null;
  if (fields.startTime !== undefined) data.eventStartTime = fields.startTime?.trim() || null;
  if (fields.duration !== undefined) data.eventDuration = fields.duration?.trim() || null;
  if (fields.eventType !== undefined) data.eventType = fields.eventType?.trim() || null;
  if (fields.eventName !== undefined) data.eventName = fields.eventName?.trim() || null;
  if (fields.venue !== undefined) data.eventLocation = fields.venue?.trim() || null;
  if (fields.package !== undefined) data.eventPackage = fields.package?.trim() || null;
  if (fields.phone !== undefined) data.eventPhone = fields.phone?.trim() || null;
  if (fields.notes !== undefined) data.notes = fields.notes?.trim() || null;
  if (fields.nextAction !== undefined) data.nextAction = fields.nextAction?.trim() || null;
  if (fields.price !== undefined) {
    if (fields.price === null || fields.price === '') data.packagePrice = null;
    else {
      const n = typeof fields.price === 'number' ? fields.price : parseFloat(String(fields.price));
      if (!Number.isFinite(n)) return { error: 'price must be a number' };
      data.packagePrice = n;
    }
  }
  if (fields.paymentStatus !== undefined) {
    const normalized = normalizePaymentStatus(fields.paymentStatus);
    if (!normalized) return { error: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}` };
    data.paymentStatus = normalized;
  }
  if (fields.galleryLinks !== undefined) {
    const links = fields.galleryLinks.filter((g) => g.url?.trim());
    for (const link of links) {
      try {
        new URL(link.url);
      } catch {
        return { error: `Invalid gallery link: ${link.url}` };
      }
    }
    data.galleryLinks = links.map((g, i) => ({ title: g.title?.trim() || (i === 0 ? 'Photo Gallery' : `Gallery ${i + 1}`), url: g.url.trim() }));
  }
  if (fields.selectedBackdropName !== undefined) data.selectedBackdropName = fields.selectedBackdropName?.trim() || null;
  if (fields.showPhoneNumberAlways !== undefined) data.showPhoneNumberAlways = fields.showPhoneNumberAlways;
  if (fields.forceVirtualGreenScreen !== undefined) data.forceVirtualGreenScreen = fields.forceVirtualGreenScreen;
  if (fields.followUpsPaused !== undefined) data.followUpsPaused = fields.followUpsPaused;
  if (fields.reviewReceived !== undefined) data.reviewReceived = fields.reviewReceived;
  if (fields.attendantName !== undefined) {
    if (!fields.attendantName?.trim()) {
      data.backdropLinkId = null;
    } else {
      const name = fields.attendantName.trim();
      const links = await prisma.backdropLink.findMany({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { attendant: { name: { equals: name, mode: 'insensitive' } } },
          ],
        },
        select: { id: true },
        take: 2,
      });
      if (links.length === 0) return { error: `No attendant named "${name}"` };
      if (links.length > 1) return { error: `More than one attendant link matches "${name}"; set it in the app` };
      data.backdropLinkId = links[0].id;
    }
  }
  return { data };
}

export async function createEvent(clientId: string, fields: EventFields) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return { error: 'Client not found' };
  const built = await eventDataFrom(fields);
  if ('error' in built) return built;
  const event = await prisma.event.create({
    data: { ...(built.data as Prisma.EventUncheckedCreateInput), clientId, paymentStatus: (built.data.paymentStatus as string) ?? DEFAULT_PAYMENT_STATUS },
    select: { id: true },
  });
  await logEventActivity(event.id, 'NOTE_ADDED', { actor: MCP_ACTOR, tool: 'create_event' });
  queueCalendarSync(event.id);
  if (fields.status && fields.status !== 'UPCOMING') {
    await setEventStatus(event.id, fields.status, { reason: fields.cancellationReason ?? null, by: MCP_ACTOR });
  }
  const result = { created: true, event: await getEvent(event.id), attendantWarnings: await attendantWarnings(event.id) };
  assertNoForbiddenFields(result);
  return result;
}

export async function updateEvent(id: string, fields: EventFields) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();
  const eventId = await resolveEventId(id);
  if (!eventId) return { error: 'Event not found' };
  const before = await getEvent(eventId);
  const built = await eventDataFrom(fields);
  if ('error' in built) return built;
  if (Object.keys(built.data).length > 0) {
    await prisma.event.update({ where: { id: eventId }, data: built.data });
    if (built.data.paymentStatus === 'Fully paid' && before?.paymentStatus !== 'Fully paid') {
      await logEventActivity(eventId, 'PAYMENT_MARKED_PAID', { actor: MCP_ACTOR, tool: 'update_event' });
    }
  }
  if (fields.status) {
    await setEventStatus(eventId, fields.status, { reason: fields.cancellationReason ?? null, by: MCP_ACTOR });
  }
  if (fields.archived !== undefined) {
    await setEventArchived(eventId, fields.archived);
  }
  queueCalendarSync(eventId);
  const after = await getEvent(eventId);
  await logEventActivity(eventId, 'NOTE_ADDED', {
    actor: MCP_ACTOR,
    tool: 'update_event',
    changed: Object.keys(fields),
  });
  const result = { updated: true, before, after, attendantWarnings: await attendantWarnings(eventId) };
  assertNoForbiddenFields(result);
  return result;
}

/** A DRAFT agreement on an existing event. Never sends it. */
export async function createAgreementForEvent(eventId: string, templateId?: string) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, clientId: true } });
  if (!event) return { error: 'Event not found' };
  let resolvedTemplateId = templateId;
  if (!resolvedTemplateId) {
    const fallback = await prisma.template.findFirst({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], select: { id: true } });
    if (!fallback) return { error: 'No templates available; pass templateId' };
    resolvedTemplateId = fallback.id;
  }
  const template = await prisma.template.findUnique({ where: { id: resolvedTemplateId }, select: { id: true, htmlContent: true } });
  if (!template) return { error: 'Template not found' };
  const agreement = await prisma.agreement.create({
    data: {
      clientId: event.clientId,
      templateId: template.id,
      eventId: event.id,
      uniqueToken: randomBytes(32).toString('hex'),
      status: 'DRAFT',
      paymentStatus: DEFAULT_PAYMENT_STATUS,
      customHtmlContent: template.htmlContent,
    },
    select: { id: true },
  });
  await logMcpAgreementActivity(agreement.id, 'NOTE_ADDED', 'create_agreement_for_event', null, {
    agreementId: agreement.id,
    eventId: event.id,
    status: 'DRAFT',
    templateId: template.id,
  }, { note: 'Draft created via MCP; not sent to client' });
  const result = { created: true, sent: false, agreementId: agreement.id, event: await getEvent(event.id) };
  assertNoForbiddenFields(result);
  return result;
}
