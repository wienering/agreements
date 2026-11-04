import Stripe from 'stripe';
import { requireMcpWriteScope } from '@/lib/mcp/authContext';
import { MCP_ACTOR } from '@/lib/mcp/config';
import { getMcpPrisma } from '@/lib/mcp/db';
import { logMcpAgreementActivity } from '@/lib/mcp/audit';
import { assertNoForbiddenFields } from '@/lib/mcp/tools/sanitize';
import { getAgreement } from '@/lib/mcp/tools/agreements';
import { getEvent } from '@/lib/mcp/tools/events';
import { MANUAL_STATUSES, manualStatusChangeError, type ManualStatus } from '@/lib/agreementStatus';
import { setAgreementArchived } from '@/lib/agreements/archiveSync';
import { sendAgreementEmail } from '@/lib/agreements/sendAgreementEmail';
import { logEventActivity, resolveEventId } from '@/lib/events/booking';
import { followupsDryRun, GOOGLE_REVIEW_URL_CALGARY, GOOGLE_REVIEW_URL_ONTARIO } from '@/lib/followups/rules';
import { sendGalleryEmail, sendReviewRequest } from '@/lib/followups/send';
import { createEventInvoice } from '@/lib/stripe/eventInvoice';
import { PAYMENT_STATUSES } from '@/lib/paymentStatus';
import { fromTorontoDateTimeLocalInput, parseTorontoCalendarDateKey } from '@/lib/dates';

/**
 * Connector tools that change agreements or send something to a client. Anything that emails a
 * client or creates a Stripe invoice needs confirm: true, so it only runs after Dennis says yes.
 */

const CONFIRM_REQUIRED = {
  error: 'This sends something to the client or creates a charge. Confirm with Dennis, then call again with confirm: true.',
};

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://agreements.photoboothguys.ca').replace(/\/$/, '');
}

/** Attendants, templates and payment statuses, so names and ids can be matched in conversation. */
export async function listOptions() {
  const prisma = getMcpPrisma();
  const [links, templates] = await Promise.all([
    prisma.backdropLink.findMany({
      orderBy: { displayOrder: 'asc' },
      select: { name: true, attendant: { select: { name: true, active: true } } },
    }),
    prisma.template.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, internalTitle: true },
    }),
  ]);
  const result = {
    attendants: links.map((link) => ({
      name: link.attendant?.name ?? link.name,
      link: link.name,
      active: link.attendant?.active ?? true,
    })),
    templates: templates.map((t) => ({ id: t.id, title: t.internalTitle || t.title })),
    paymentStatuses: [...PAYMENT_STATUSES],
    eventStatuses: ['UPCOMING', 'COMPLETED', 'CANCELLED'],
    agreementStatuses: [...MANUAL_STATUSES],
  };
  assertNoForbiddenFields(result);
  return result;
}

export type AgreementFields = {
  expiresAt?: string | null;
  templateId?: string;
  status?: ManualStatus;
  chaserPaused?: boolean;
  archived?: boolean;
  secondSignerEnabled?: boolean;
  secondSignerFirstName?: string | null;
  secondSignerLastName?: string | null;
  secondSignerEmail?: string | null;
  secondSignerPhone?: string | null;
  requireBothSignatures?: boolean;
};

function parseExpiry(value: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const day = parseTorontoCalendarDateKey(value);
    return day ? fromTorontoDateTimeLocalInput(`${value}T23:59`) : null;
  }
  const local = value.includes('T') && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const d = local ? fromTorontoDateTimeLocalInput(value.slice(0, 16)) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Change an agreement's settings. Signing rules still apply (a signed agreement never goes back). */
export async function updateAgreement(id: string, fields: AgreementFields) {
  requireMcpWriteScope();
  const prisma = getMcpPrisma();
  const existing = await prisma.agreement.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) return { error: 'Agreement not found' };
  const before = await getAgreement(id);

  const data: Record<string, unknown> = {};
  if (fields.expiresAt !== undefined) {
    if (fields.expiresAt === null) data.expiresAt = null;
    else {
      const d = parseExpiry(fields.expiresAt);
      if (!d) return { error: 'expiresAt must be a date (YYYY-MM-DD) or date-time' };
      data.expiresAt = d;
    }
  }
  if (fields.templateId !== undefined) {
    if (existing.status !== 'DRAFT') return { error: 'The template can only be changed on a draft' };
    const template = await prisma.template.findUnique({ where: { id: fields.templateId }, select: { id: true, htmlContent: true } });
    if (!template) return { error: 'Template not found' };
    data.templateId = template.id;
    data.customHtmlContent = template.htmlContent;
  }
  if (fields.status !== undefined) {
    const refusal = manualStatusChangeError(existing.status, fields.status);
    if (refusal) return { error: refusal };
    data.status = fields.status;
  }
  if (fields.chaserPaused !== undefined) data.chaserPaused = fields.chaserPaused;
  if (fields.secondSignerEnabled !== undefined) data.secondSignerEnabled = fields.secondSignerEnabled;
  if (fields.secondSignerFirstName !== undefined) data.secondSignerFirstName = fields.secondSignerFirstName?.trim() || null;
  if (fields.secondSignerLastName !== undefined) data.secondSignerLastName = fields.secondSignerLastName?.trim() || null;
  if (fields.secondSignerEmail !== undefined) {
    const email = fields.secondSignerEmail?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Second signer email is not valid' };
    data.secondSignerEmail = email;
  }
  if (fields.secondSignerPhone !== undefined) data.secondSignerPhone = fields.secondSignerPhone?.trim() || null;
  if (fields.requireBothSignatures !== undefined) data.requireBothSignatures = fields.requireBothSignatures;

  if (Object.keys(data).length > 0) {
    await prisma.agreement.update({ where: { id }, data });
  }
  if (fields.archived !== undefined) {
    await setAgreementArchived(id, fields.archived);
  }
  const after = await getAgreement(id);
  await logMcpAgreementActivity(id, 'NOTE_ADDED', 'update_agreement', before, after, { changed: Object.keys(fields) });
  const result = { updated: true, before, after };
  assertNoForbiddenFields(result);
  return result;
}

/** Email the client their agreement to sign. */
export async function sendAgreement(agreementId: string, confirm?: boolean) {
  requireMcpWriteScope();
  if (!confirm) return CONFIRM_REQUIRED;
  const result = await sendAgreementEmail(agreementId, baseUrl());
  const body = { ...result.body } as Record<string, unknown>;
  // Never hand the signing link to the connector.
  delete body.fallback;
  if (result.httpStatus !== 200) return { error: String(body.error ?? 'Could not send the agreement') };
  await logMcpAgreementActivity(agreementId, 'NOTE_ADDED', 'send_agreement', null, { sent: true }, { note: `Sent by ${MCP_ACTOR}` });
  assertNoForbiddenFields(body);
  return body;
}

export async function sendEventGalleryEmail(eventId: string, options: { resend?: boolean; confirm?: boolean }) {
  requireMcpWriteScope();
  if (!options.confirm) return CONFIRM_REQUIRED;
  const id = await resolveEventId(eventId);
  if (!id) return { error: 'Event not found' };
  const result = await sendGalleryEmail(id, { trigger: 'manual', dryRun: followupsDryRun(), resend: options.resend });
  if (result.status === 'sent' || result.status === 'dry_run') {
    await logEventActivity(id, 'NOTE_ADDED', { actor: MCP_ACTOR, tool: 'send_gallery_email' });
    return { sent: result.status === 'sent', dryRun: result.status === 'dry_run', to: result.to };
  }
  return { error: result.reason };
}

export async function sendEventReviewRequest(eventId: string, options: { market?: 'ontario' | 'calgary'; confirm?: boolean }) {
  requireMcpWriteScope();
  if (!options.confirm) return CONFIRM_REQUIRED;
  const id = await resolveEventId(eventId);
  if (!id) return { error: 'Event not found' };
  const market = options.market ?? 'ontario';
  const result = await sendReviewRequest(id, {
    trigger: 'manual',
    dryRun: followupsDryRun(),
    reviewUrl: market === 'calgary' ? GOOGLE_REVIEW_URL_CALGARY : GOOGLE_REVIEW_URL_ONTARIO,
    market,
  });
  if (result.status === 'sent' || result.status === 'dry_run') {
    return { sent: result.status === 'sent', dryRun: result.status === 'dry_run', to: result.to };
  }
  return { error: result.reason };
}

export async function createInvoice(
  eventId: string,
  options: {
    invoiceType?: 'default' | 'total-only' | 'total-minus-deposit' | 'custom-amount';
    customAmount?: number;
    disableOnlinePayment?: boolean;
    confirm?: boolean;
  },
) {
  requireMcpWriteScope();
  if (!options.confirm) return CONFIRM_REQUIRED;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { error: 'Stripe is not configured' };
  const id = await resolveEventId(eventId);
  if (!id) return { error: 'Event not found' };
  try {
    const result = await createEventInvoice(new Stripe(key), {
      agreementId: id,
      invoiceType: options.invoiceType ?? 'default',
      customAmount: options.customAmount,
      disableOnlinePayment: options.disableOnlinePayment ?? false,
    });
    if (result.httpStatus !== 200) return { error: String(result.body.error ?? 'Could not create the invoice') };
    await logEventActivity(id, 'NOTE_ADDED', { actor: MCP_ACTOR, tool: 'create_invoice' });
    const body = { ...result.body, event: await getEvent(id) };
    assertNoForbiddenFields(body);
    return body;
  } catch (error) {
    console.error('[mcp] create_invoice failed', error);
    return { error: 'Stripe could not create the invoice. Check the event price and client email.' };
  }
}
