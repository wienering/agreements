import type { Lead } from '@prisma/client';

export type LeadForSearch = Pick<Lead, 'firstName' | 'lastName' | 'email'> & { id: string };

export type FoldedLeadForSearch<T extends LeadForSearch = LeadForSearch> = {
  primary: T;
  others: T[];
};

export type FilteredFoldedLead<T extends LeadForSearch = LeadForSearch> = {
  folded: FoldedLeadForSearch<T>;
  forceExpanded: boolean;
};

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function leadMatchesSearch(lead: LeadForSearch, query: string): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return true;
  }

  const name = `${lead.firstName} ${lead.lastName}`.trim().toLowerCase();
  const email = lead.email.trim().toLowerCase();
  return name.includes(normalized) || email.includes(normalized);
}

export function filterFoldedLeadsBySearch<T extends LeadForSearch>(
  foldedLeads: FoldedLeadForSearch<T>[],
  query: string,
): FilteredFoldedLead<T>[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return foldedLeads.map((folded) => ({ folded, forceExpanded: false }));
  }

  const results: FilteredFoldedLead<T>[] = [];

  for (const folded of foldedLeads) {
    const primaryMatches = leadMatchesSearch(folded.primary, normalized);
    const othersMatch = folded.others.some((other) => leadMatchesSearch(other, normalized));

    if (!primaryMatches && !othersMatch) {
      continue;
    }

    results.push({
      folded,
      forceExpanded: !primaryMatches && othersMatch,
    });
  }

  return results;
}

export function countMatchingLeads<T extends LeadForSearch>(
  leads: T[],
  foldedLeads: FoldedLeadForSearch<T>[] | null,
  query: string,
): number {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return leads.length;
  }

  if (foldedLeads) {
    let count = 0;
    for (const folded of foldedLeads) {
      if (leadMatchesSearch(folded.primary, normalized)) {
        count += 1;
      }
      for (const other of folded.others) {
        if (leadMatchesSearch(other, normalized)) {
          count += 1;
        }
      }
    }
    return count;
  }

  return leads.filter((lead) => leadMatchesSearch(lead, normalized)).length;
}

export function filterLeadsBySearch<T extends LeadForSearch>(leads: T[], query: string): T[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return leads;
  }

  return leads.filter((lead) => leadMatchesSearch(lead, normalized));
}
