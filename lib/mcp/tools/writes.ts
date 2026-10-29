import { randomBytes } from 'crypto';
import { requireMcpWriteScope } from '@/lib/mcp/authContext';
import { getMcpPrisma } from '@/lib/mcp/db';
import { logMcpAgreementActivity, logMcpAudit } from '@/lib/mcp/audit';
import { assertNoForbiddenFields } from '@/lib/mcp/tools/sanitize';
import { mcpDateTime } from '@/lib/mcp/tools/datetime';
import { isLikelyDuplicateClient, splitClientName } from '@/lib/mcp/tools/names';
import { getAgreement } from '@/lib/mcp/tools/agreements';
import { normalizePaymentStatus, PAYMENT_STATUSES, DEFAULT_PAYMENT_STATUS } from '@/lib/paymentStatus';
import { fromTorontoDateTimeLocalInput, normalizeEventDateToNoonUtc, parseTorontoCalendarDateKey } from '@/lib/dates';
import { conflictsForAssignment, type AttendantConflict } from '@/lib/attendants/conflicts';
import { loadConflictAgreement, loadConflictBuffers, loadUpcomingAssignedAgreements } from '@/lib/attendants/conflictQuery';

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

function durationFromTimes(startTime?: string | null, endTime?: string | null): string | null {
  if (!startTime?.trim() || !endTime?.trim()) return null;
  const toMinutes = (raw: string): number | null => {
    const t = raw.trim().toLowerCase();
    const ampm = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(t);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = parseInt(ampm[2], 10);
      const meridiem = ampm[3].toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      return h * 60 + m;
    }
    const h24 = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (h24) return parseInt(h24[1], 10) * 60 + parseInt(h24[2], 10);
    return null;
  };
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null || end <= start) return null;
  const hours = (end - start) / 60;
  return Number.isInteger(hours) ? `${hours} hours` : `${hours} hours`;
}

async function attendantWarningsForAgreement(agreementId: string): Promise<AttendantConflict[]> {
  const candidate = await loadConflictAgreement(agreementId);
  if (!candidate?.attendantId) return [];
  const [others, buffers] = await Promise.all([
    loadUpcomingAssignedAgreements(),
    loadConflictBuffers(),
  ]);
  return conflictsForAssignment(candidate, candidate.attendantId, others, buffers).map((c) => ({
    ...c,
    otherStart: mcpDateTime(c.otherStart),
    otherEnd: mcpDateTime(c.otherEnd),
  }));
}

function clientSnapshot(client: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  emailGreetingName: string | null;
  address: string | null;
}) {
  return {
    id: client.id,
    name: `${client.firstName} ${client.lastName}`.trim(),
    email: client.email,
    phone: client.phone,
    emailGreetingName: client.emailGreetingName,
    address: client.address,
    company: null as string | null,
  };
}

export type ClientWriteFields = {
  name?: string;
  company?: string | null;
  email?: string;
  phone?: string | null;
  emailGreetingName?: string | null;
  address?: string | null;
};

export async function updateClient(id: string, fields: ClientWriteFields) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return { error: 'Client not found' };

  const before = clientSnapshot(existing);
  const data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    emailGreetingName?: string | null;
    address?: string | null;
    addressAddedAt?: Date;
  } = {};
  const warnings: string[] = [];

  if (fields.name !== undefined) {
    const { firstName, lastName } = splitClientName(fields.name);
    data.firstName = firstName;
    data.lastName = lastName;
  }
  if (fields.email !== undefined) {
    data.email = fields.email.normalize('NFKC').trim().toLowerCase();
  }
  if (fields.phone !== undefined) data.phone = fields.phone?.trim() || null;
  if (fields.emailGreetingName !== undefined) {
    data.emailGreetingName = fields.emailGreetingName?.trim() || null;
  }
  if (fields.address !== undefined) {
    data.address = fields.address?.trim() || null;
    if (data.address && !existing.address) data.addressAddedAt = new Date();
  }
  if (fields.company !== undefined && fields.company !== null && String(fields.company).trim()) {
    warnings.push('company is not a stored field on Client; value was ignored');
  }

  const updated = await prisma.client.update({ where: { id }, data });
  const after = clientSnapshot(updated);

  const signedAgreements = await prisma.agreement.findMany({
    where: { clientId: id, status: { in: ['SIGNED', 'COMPLETED'] }, archived: false },
    select: { id: true, status: true },
  });

  const signedDocumentStillShowsOriginalName =
    Boolean(fields.name) && signedAgreements.length > 0;

  for (const agreement of signedAgreements) {
    await logMcpAgreementActivity(agreement.id, 'NOTE_ADDED', 'update_client', before, after, {
      note: 'Client CRM fields updated; signed document content was not changed',
    });
  }
  await logMcpAudit('MCP_UPDATE_CLIENT', 'update_client', { before, after, warnings });

  const result = {
    before,
    after,
    warnings,
    signedDocumentStillShowsOriginalName,
    signedAgreements: signedAgreements.map((a) => ({ id: a.id, status: a.status })),
  };
  assertNoForbiddenFields(result);
  return result;
}

export async function createClient(
  fields: ClientWriteFields & { confirmDuplicate?: boolean },
) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();

  if (!fields.name?.trim() || !fields.email?.trim()) {
    return { error: 'name and email are required' };
  }

  const { firstName, lastName } = splitClientName(fields.name);
  const email = fields.email.normalize('NFKC').trim().toLowerCase();
  const warnings: string[] = [];
  if (fields.company !== undefined && fields.company !== null && String(fields.company).trim()) {
    warnings.push('company is not a stored field on Client; value was ignored');
  }

  if (!fields.confirmDuplicate) {
    const candidates = await prisma.client.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        emailGreetingName: true,
        address: true,
      },
      take: 500,
      orderBy: { updatedAt: 'desc' },
    });
    const duplicates = candidates
      .filter((c) => isLikelyDuplicateClient({ firstName, lastName, email }, c))
      .slice(0, 10)
      .map(clientSnapshot);

    if (duplicates.length > 0) {
      const result = {
        created: false,
        reason: 'likely_duplicates',
        duplicates,
        message: 'Pass confirmDuplicate: true to create anyway',
      };
      assertNoForbiddenFields(result);
      return result;
    }
  }

  const address = fields.address?.trim() || null;
  const created = await prisma.client.create({
    data: {
      firstName,
      lastName,
      email,
      phone: fields.phone?.trim() || null,
      emailGreetingName: fields.emailGreetingName?.trim() || null,
      address,
      addressAddedAt: address ? new Date() : null,
    },
  });

  const after = clientSnapshot(created);
  await logMcpAudit('MCP_CREATE_CLIENT', 'create_client', { after, warnings });

  const result = { created: true, client: after, warnings };
  assertNoForbiddenFields(result);
  return result;
}

export async function setPaymentStatus(agreementId: string, status: string) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();
  const normalized = normalizePaymentStatus(status);
  if (!normalized) {
    return {
      error: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}`,
    };
  }

  const existing = await prisma.agreement.findUnique({
    where: { id: agreementId },
    select: { id: true, paymentStatus: true, status: true },
  });
  if (!existing) return { error: 'Agreement not found' };

  const before = { paymentStatus: existing.paymentStatus };
  await prisma.agreement.update({
    where: { id: agreementId },
    data: { paymentStatus: normalized },
  });
  const after = { paymentStatus: normalized };

  const activityType = normalized === 'Fully paid' ? 'PAYMENT_MARKED_PAID' : 'NOTE_ADDED';
  await logMcpAgreementActivity(agreementId, activityType, 'set_payment_status', before, after);

  const result = { agreementId, before, after };
  assertNoForbiddenFields(result);
  return result;
}

export async function addClientNote(clientId: string, text: string) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();
  const content = text.trim();
  if (!content) return { error: 'text is required' };
  if (content.length > 5000) return { error: 'text must be 5000 characters or less' };

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return { error: 'Client not found' };

  const agreement = await prisma.agreement.findFirst({
    where: { clientId, archived: false },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  const note = await prisma.clientNote.create({
    data: {
      clientId,
      agreementId: agreement?.id ?? null,
      content,
    },
  });

  if (agreement) {
    await logMcpAgreementActivity(
      agreement.id,
      'NOTE_ADDED',
      'add_client_note',
      null,
      { noteId: note.id, content },
    );
  } else {
    await logMcpAudit('MCP_ADD_CLIENT_NOTE', 'add_client_note', {
      clientId,
      noteId: note.id,
      content,
    });
  }

  const result = {
    noteId: note.id,
    clientId,
    agreementId: agreement?.id ?? null,
    createdAt: mcpDateTime(note.createdAt),
    clientProvidedText: content,
  };
  assertNoForbiddenFields(result);
  return result;
}

export type AgreementDraftFields = {
  templateId?: string;
  eventDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  package?: string | null;
  price?: string | number | null;
  notes?: string | null;
};

export async function createAgreementDraft(clientId: string, fields: AgreementDraftFields) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return { error: 'Client not found' };

  let templateId = fields.templateId?.trim();
  if (!templateId) {
    const fallback = await prisma.template.findFirst({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!fallback) return { error: 'No templates available; pass templateId' };
    templateId = fallback.id;
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true, htmlContent: true, title: true },
  });
  if (!template) return { error: 'Template not found' };

  const eventDate = fields.eventDate ? parseEventDateInput(fields.eventDate) : null;
  const duration =
    fields.duration?.trim() ||
    durationFromTimes(fields.startTime, fields.endTime) ||
    null;
  const location =
    [fields.venueName, fields.venueAddress].filter((v) => v?.trim()).join(' — ') ||
    fields.venueAddress?.trim() ||
    fields.venueName?.trim() ||
    null;

  let packagePrice: number | null = null;
  if (fields.price !== undefined && fields.price !== null && fields.price !== '') {
    const n = typeof fields.price === 'number' ? fields.price : parseFloat(String(fields.price));
    if (!Number.isFinite(n)) return { error: 'price must be a number' };
    packagePrice = n;
  }

  const event = await prisma.event.create({
    data: {
      clientId,
      eventDate,
      eventStartTime: fields.startTime?.trim() || null,
      eventDuration: duration,
      eventLocation: location,
      eventPackage: fields.package?.trim() || null,
      packagePrice,
      notes: fields.notes?.trim() || null,
      eventName: fields.venueName?.trim() || null,
    },
  });

  const agreement = await prisma.agreement.create({
    data: {
      clientId,
      templateId: template.id,
      eventId: event.id,
      uniqueToken: randomBytes(32).toString('hex'),
      status: 'DRAFT',
      paymentStatus: DEFAULT_PAYMENT_STATUS,
      customHtmlContent: template.htmlContent,
    },
  });

  await logMcpAgreementActivity(
    agreement.id,
    'NOTE_ADDED',
    'create_agreement_draft',
    null,
    {
      agreementId: agreement.id,
      eventId: event.id,
      status: 'DRAFT',
      templateId: template.id,
    },
    { note: 'Draft created via MCP; not sent to client' },
  );

  const warnings = await attendantWarningsForAgreement(agreement.id);
  const summary = await getAgreement(agreement.id);
  const result = {
    created: true,
    sent: false,
    agreement: summary,
    attendantWarnings: warnings,
  };
  assertNoForbiddenFields(result);
  return result;
}

export async function updateAgreementDraft(id: string, fields: AgreementDraftFields) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();

  const existing = await prisma.agreement.findUnique({
    where: { id },
    include: {
      event: true,
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!existing) return { error: 'Agreement not found' };
  if (existing.status !== 'DRAFT') {
    return {
      error: 'Only draft/unsent agreements can be updated with update_agreement_draft',
      status: existing.status,
    };
  }

  const before = await getAgreement(id);

  const eventData: {
    eventDate?: Date | null;
    eventStartTime?: string | null;
    eventDuration?: string | null;
    eventLocation?: string | null;
    eventPackage?: string | null;
    packagePrice?: number | null;
    notes?: string | null;
    eventName?: string | null;
  } = {};

  if (fields.eventDate !== undefined) {
    eventData.eventDate = fields.eventDate ? parseEventDateInput(fields.eventDate) : null;
  }
  if (fields.startTime !== undefined) eventData.eventStartTime = fields.startTime?.trim() || null;
  if (fields.duration !== undefined || fields.endTime !== undefined) {
    eventData.eventDuration =
      fields.duration?.trim() ||
      durationFromTimes(
        fields.startTime ?? existing.event?.eventStartTime,
        fields.endTime,
      ) ||
      (fields.duration === null ? null : existing.event?.eventDuration ?? null);
  }
  if (fields.venueName !== undefined || fields.venueAddress !== undefined) {
    const venueName = fields.venueName !== undefined ? fields.venueName : existing.event?.eventName;
    const venueAddress =
      fields.venueAddress !== undefined ? fields.venueAddress : existing.event?.eventLocation;
    eventData.eventName = venueName?.trim() || null;
    eventData.eventLocation =
      [venueName, venueAddress].filter((v) => v && String(v).trim()).join(' — ') ||
      venueAddress?.trim() ||
      venueName?.trim() ||
      null;
  }
  if (fields.package !== undefined) eventData.eventPackage = fields.package?.trim() || null;
  if (fields.notes !== undefined) eventData.notes = fields.notes?.trim() || null;
  if (fields.price !== undefined) {
    if (fields.price === null || fields.price === '') {
      eventData.packagePrice = null;
    } else {
      const n = typeof fields.price === 'number' ? fields.price : parseFloat(String(fields.price));
      if (!Number.isFinite(n)) return { error: 'price must be a number' };
      eventData.packagePrice = n;
    }
  }

  if (Object.keys(eventData).length > 0) {
    if (existing.eventId) {
      await prisma.event.update({ where: { id: existing.eventId }, data: eventData });
    } else {
      const event = await prisma.event.create({
        data: { clientId: existing.clientId, ...eventData },
      });
      await prisma.agreement.update({ where: { id }, data: { eventId: event.id } });
    }
  }

  if (fields.templateId) {
    // Draft-only: swapping template resets custom HTML from the new template.
    const template = await prisma.template.findUnique({
      where: { id: fields.templateId },
      select: { id: true, htmlContent: true },
    });
    if (!template) return { error: 'Template not found' };
    await prisma.agreement.update({
      where: { id },
      data: { templateId: template.id, customHtmlContent: template.htmlContent },
    });
  }

  const after = await getAgreement(id);
  await logMcpAgreementActivity(id, 'NOTE_ADDED', 'update_agreement_draft', before, after);

  const warnings = await attendantWarningsForAgreement(id);
  const result = {
    before,
    after,
    attendantWarnings: warnings,
  };
  assertNoForbiddenFields(result);
  return result;
}
