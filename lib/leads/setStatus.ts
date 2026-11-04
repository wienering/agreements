import type { LeadStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { LEAD_STATUS_LABELS, isOpenStatus } from '@/lib/leads/status';
import { queueLeadSheetSync } from '@/lib/leads/sheetSync';

export type LeadActivitySource = 'admin' | 'n8n' | 'connector' | 'backfill';

export type SetLeadStatusInput = {
  leadId: string;
  status: LeadStatus;
  lostReason?: string | null;
  source: LeadActivitySource;
  /** Extra text for the timeline entry. */
  note?: string | null;
  occurredAt?: Date;
  externalKey?: string | null;
  /** Write the change to the Sheet. False when the change came from n8n (it already wrote the Sheet). */
  syncSheet: boolean;
};

export type SetLeadStatusResult = { changed: boolean; previous: LeadStatus };

/**
 * Change a lead's status, log it on the timeline, and (optionally) push it to the Sheet.
 * Moving a booked/lost lead back to an open status takes it out of the archive.
 */
export async function setLeadStatus(input: SetLeadStatusInput): Promise<SetLeadStatusResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    select: { id: true, status: true, lostReason: true, archivedAt: true, archiveReason: true },
  });
  if (!lead) throw new Error(`Lead ${input.leadId} not found`);

  const lostReason = input.status === 'LOST' ? input.lostReason?.trim() || null : null;
  const previous = lead.status;
  if (previous === input.status && (lead.lostReason ?? null) === lostReason) {
    return { changed: false, previous };
  }

  const unarchive =
    isOpenStatus(input.status) &&
    lead.archivedAt !== null &&
    (lead.archiveReason === 'booked' || lead.archiveReason === 'lost');

  const label = `${LEAD_STATUS_LABELS[previous]} → ${LEAD_STATUS_LABELS[input.status]}${lostReason ? ` (${lostReason})` : ''}`;

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: input.status,
        lostReason,
        ...(unarchive ? { archivedAt: null, archiveReason: null } : {}),
      },
    }),
    prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        kind: 'STATUS_CHANGED',
        summary: input.note ? `${label}. ${input.note}` : label,
        source: input.source,
        externalKey: input.externalKey ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    }),
  ]);

  if (input.syncSheet) queueLeadSheetSync(lead.id, previous);
  return { changed: true, previous };
}
