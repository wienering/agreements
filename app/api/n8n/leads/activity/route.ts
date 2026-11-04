import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { LeadActivityKind, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/handleApiError';
import { verifyN8nSecret } from '@/lib/n8nAuth';
import { parseFollowUpDate, sheetStatusToLead } from '@/lib/leads/status';
import { setLeadStatus } from '@/lib/leads/setStatus';

/**
 * Touch log from WF1/WF2. Each call adds a timeline entry and keeps the lead's follow-up fields in step.
 *   email / sms     a touch was sent: last contacted, touch count, next follow-up; New → Following up
 *   reply           a reply was found in Gmail: last reply date
 *   delay / reset   next follow-up moved (reset also reopens a lost or paused lead)
 *   status          a Telegram decision: `status` is the Sheet value (booked, declined, fake, dead, ...)
 * n8n has already written the Sheet, so nothing here writes back to it.
 */

const optionalText = z.union([z.string(), z.number()]).optional().nullable().transform((v) => (v == null ? undefined : String(v).trim() || undefined));

const activitySchema = z.object({
  type: z.enum(['email', 'sms', 'reply', 'delay', 'reset', 'status']),
  sheetLeadId: optionalText,
  crmLeadId: optionalText,
  email: optionalText,
  touchNumber: z.union([z.number(), z.string()]).optional().nullable().transform((v) => {
    const n = v == null || v === '' ? NaN : Number(v);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  }),
  subject: optionalText,
  summary: optionalText,
  status: optionalText,
  nextFollowUp: optionalText,
  occurredAt: optionalText,
  externalKey: optionalText,
});

type ActivityInput = z.infer<typeof activitySchema>;

async function findLead(input: ActivityInput) {
  const select = { id: true, status: true, contactCount: true } as const;
  if (input.sheetLeadId) {
    const lead = await prisma.lead.findUnique({ where: { sheetLeadId: input.sheetLeadId }, select });
    if (lead) return lead;
  }
  if (input.crmLeadId) {
    const lead = await prisma.lead.findUnique({ where: { id: input.crmLeadId }, select });
    if (lead) return lead;
  }
  if (input.email) {
    return prisma.lead.findFirst({
      where: { email: { equals: input.email, mode: 'insensitive' } },
      orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
      select,
    });
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

const KIND: Record<Exclude<ActivityInput['type'], 'status'>, LeadActivityKind> = {
  email: 'EMAIL_SENT',
  sms: 'SMS_SENT',
  reply: 'REPLY_DETECTED',
  delay: 'DELAYED',
  reset: 'DELAYED',
};

export async function POST(request: NextRequest) {
  if (!verifyN8nSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const input = activitySchema.parse(await request.json());
    const lead = await findLead(input);
    if (!lead) {
      return NextResponse.json({ ok: false, error: 'No matching lead in the CRM' }, { status: 404 });
    }

    const occurredAt = (input.occurredAt && parseFollowUpDate(input.occurredAt)) || new Date();
    const nextFollowUpAt = parseFollowUpDate(input.nextFollowUp);

    if (input.externalKey) {
      const seen = await prisma.leadActivity.findUnique({ where: { externalKey: input.externalKey }, select: { id: true } });
      if (seen) return NextResponse.json({ ok: true, leadId: lead.id, duplicate: true });
    }

    if (input.type === 'status') {
      const mapped = sheetStatusToLead(input.status);
      const result = await setLeadStatus({
        leadId: lead.id,
        status: mapped.status,
        lostReason: mapped.lostReason,
        source: 'n8n',
        note: input.summary ?? null,
        occurredAt,
        externalKey: input.externalKey ?? null,
        syncSheet: false,
      });
      if (nextFollowUpAt !== null || mapped.status === 'BOOKED' || mapped.status === 'LOST') {
        await prisma.lead.update({ where: { id: lead.id }, data: { nextFollowUpAt } });
      }
      return NextResponse.json({ ok: true, leadId: lead.id, changed: result.changed });
    }

    const summary =
      input.summary ??
      (input.type === 'email'
        ? `Follow-up email${input.touchNumber ? ` #${input.touchNumber}` : ''}${input.subject ? `: ${input.subject}` : ''}`
        : input.type === 'sms'
          ? 'Text message sent'
          : input.type === 'reply'
            ? 'Reply found in Gmail'
            : input.type === 'reset'
              ? 'Sequence restarted'
              : 'Follow-up delayed');

    const leadData: Prisma.LeadUpdateInput = {};
    if (input.type === 'email' || input.type === 'sms') {
      leadData.lastContactedAt = occurredAt;
      leadData.contactCount = input.touchNumber ?? lead.contactCount + 1;
    }
    if (input.type === 'reset' && input.touchNumber !== undefined) {
      leadData.contactCount = input.touchNumber;
    }
    if (input.type === 'reply') leadData.lastReplyAt = occurredAt;
    if (nextFollowUpAt) leadData.nextFollowUpAt = nextFollowUpAt;

    try {
      await prisma.$transaction([
        prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            kind: KIND[input.type],
            touchNumber: input.touchNumber ?? null,
            summary,
            source: 'n8n',
            externalKey: input.externalKey ?? null,
            occurredAt,
          },
        }),
        prisma.lead.update({ where: { id: lead.id }, data: leadData }),
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) return NextResponse.json({ ok: true, leadId: lead.id, duplicate: true });
      throw error;
    }

    // A touch or a restart means the lead is in the sequence.
    const reopen = input.type === 'reset' ? lead.status !== 'FOLLOWING_UP' && lead.status !== 'BOOKED' : lead.status === 'NEW';
    if (input.type !== 'reply' && reopen) {
      await setLeadStatus({ leadId: lead.id, status: 'FOLLOWING_UP', source: 'n8n', occurredAt, syncSheet: false });
    }

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (error) {
    return handleApiError(error, 'n8n/leads/activity', request.method);
  }
}
