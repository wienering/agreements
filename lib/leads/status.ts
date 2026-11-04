import type { LeadStatus } from '@prisma/client';
import { parseTorontoCalendarDateKey } from '@/lib/dates';

/**
 * Lead status and how it lines up with the "Pre-Booking Leads Not Booked" Sheet.
 * WF2 (n8n "Follow Up Trigger") only follows up rows whose `new status` is exactly "active",
 * so writing anything else to that column takes a lead out of the sequence.
 */

export const LEAD_STATUSES: LeadStatus[] = ['NEW', 'FOLLOWING_UP', 'BOOKED', 'LOST', 'PAUSED'];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  FOLLOWING_UP: 'Following up',
  BOOKED: 'Booked',
  LOST: 'Lost',
  PAUSED: 'Paused',
};

/** Lost reasons, worded as the Sheet's `new status` values so they can be written straight across. */
export const LOST_REASONS = ['declined', 'fake', 'duplicate', 'old', 'no response', 'already booked'] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const DEFAULT_LOST_REASON: LostReason = 'declined';

export function isLostReason(value: unknown): value is LostReason {
  return typeof value === 'string' && (LOST_REASONS as readonly string[]).includes(value);
}

/** Sheet `new status` → CRM status. Unknown values are treated as lost with that word as the reason. */
export function sheetStatusToLead(raw: string | null | undefined): {
  status: LeadStatus;
  lostReason: string | null;
} {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === '') return { status: 'NEW', lostReason: null };
  if (value === 'active') return { status: 'FOLLOWING_UP', lostReason: null };
  if (value === 'booked') return { status: 'BOOKED', lostReason: null };
  if (value === 'paused') return { status: 'PAUSED', lostReason: null };
  // "dead" is what WF1 writes for both Already Booked and Kill Lead; it carries no detail.
  if (value === 'dead') return { status: 'LOST', lostReason: null };
  return { status: 'LOST', lostReason: value };
}

/**
 * CRM status → what to write to the Sheet's `new status`, or null to leave the row alone.
 * New and Following up are left to WF1/WF2, so the CRM never starts the sequence by itself.
 * Resuming a paused lead is the one case that writes "active".
 */
export function leadStatusToSheet(
  status: LeadStatus,
  lostReason: string | null | undefined,
  previous?: LeadStatus,
): string | null {
  switch (status) {
    case 'BOOKED':
      return 'booked';
    case 'LOST':
      return lostReason?.trim() || DEFAULT_LOST_REASON;
    case 'PAUSED':
      return 'paused';
    case 'FOLLOWING_UP':
      return previous === 'PAUSED' ? 'active' : null;
    default:
      return null;
  }
}

/** Legacy stage → status (same rules as the migration backfill). */
export function statusFromStage(stage: string): LeadStatus {
  if (stage === 'AGREEMENT_SENT' || stage === 'SIGNED' || stage === 'COMPLETED') return 'BOOKED';
  if (stage === 'LOST') return 'LOST';
  return 'NEW';
}

/** Open = still being worked (shown in the active list, followed up by n8n or paused). */
export function isOpenStatus(status: LeadStatus): boolean {
  return status === 'NEW' || status === 'FOLLOWING_UP' || status === 'PAUSED';
}

/**
 * Parse a follow-up date from n8n or the Sheet: "M/d/yyyy" (the Sheet's format), "yyyy-MM-dd",
 * or a full ISO timestamp. Date-only values become Toronto midnight. Returns null if unreadable.
 */
export function parseFollowUpDate(raw: string | null | undefined): Date | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (us) {
    const key = `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
    return parseTorontoCalendarDateKey(key);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseTorontoCalendarDateKey(value);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Format a date the way the Sheet's `next follow-up date` column holds it (M/d/yyyy, Toronto). */
export function formatSheetDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('month')}/${get('day')}/${get('year')}`;
}
