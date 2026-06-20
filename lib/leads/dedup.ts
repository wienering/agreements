import type { Lead } from '@prisma/client';

export type LeadForDedup = Pick<Lead, 'id' | 'email' | 'eventDate' | 'createdAt'>;

export type FoldedLead<T extends LeadForDedup = LeadForDedup> = {
  primary: T;
  others: T[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Soonest eventDate wins (nulls last); tie-break by most recent createdAt. */
export function compareLeadsForPrimary<T extends LeadForDedup>(a: T, b: T): number {
  const aEvent = a.eventDate ? new Date(a.eventDate).getTime() : Number.POSITIVE_INFINITY;
  const bEvent = b.eventDate ? new Date(b.eventDate).getTime() : Number.POSITIVE_INFINITY;

  if (aEvent !== bEvent) {
    return aEvent - bEvent;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortLeadsByPrimaryRule<T extends LeadForDedup>(leads: T[]): T[] {
  return [...leads].sort(compareLeadsForPrimary);
}

export function foldLeadsByEmail<T extends LeadForDedup>(leads: T[]): FoldedLead<T>[] {
  const byEmail = new Map<string, T[]>();

  for (const lead of leads) {
    const key = normalizeEmail(lead.email);
    const group = byEmail.get(key);
    if (group) {
      group.push(lead);
    } else {
      byEmail.set(key, [lead]);
    }
  }

  const folded: FoldedLead<T>[] = [];

  for (const group of Array.from(byEmail.values())) {
    const sorted = sortLeadsByPrimaryRule(group);
    const primary = sorted[0];
    const others = sorted.slice(1);
    folded.push({ primary, others });
  }

  return folded;
}
