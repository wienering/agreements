import type { LeadStage, LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type LeadTab = 'active' | 'archived' | 'all';

export function parseLeadTab(value: string | null | undefined): LeadTab {
  if (value === 'archived' || value === 'all') {
    return value;
  }
  return 'active';
}

export const leadListInclude = {
  client: { select: { id: true, firstName: true, lastName: true, email: true } },
  event: { select: { id: true, eventDate: true, eventType: true } },
  agreement: { select: { id: true, status: true, uniqueToken: true } },
} satisfies Prisma.LeadInclude;

function applyStageFilter(
  where: Prisma.LeadWhereInput,
  stage: string | null | undefined,
): Prisma.LeadWhereInput {
  if (!stage) {
    return where;
  }
  return { ...where, stage: stage as LeadStage };
}

const LEAD_STATUS_VALUES = new Set(['NEW', 'FOLLOWING_UP', 'BOOKED', 'LOST', 'PAUSED']);

function applyStatusFilter(
  where: Prisma.LeadWhereInput,
  status: string | null | undefined,
): Prisma.LeadWhereInput {
  if (!status || !LEAD_STATUS_VALUES.has(status)) {
    return where;
  }
  return { ...where, status: status as LeadStatus };
}

export function buildLeadTabWhere(
  tab: LeadTab,
  stage?: string | null,
  status?: string | null,
): Prisma.LeadWhereInput {
  let where: Prisma.LeadWhereInput = {};

  if (tab === 'active') {
    where.archivedAt = null;
  } else if (tab === 'archived') {
    where.archivedAt = { not: null };
  }

  return applyStatusFilter(applyStageFilter(where, stage), status);
}

export const leadTabCountsWhere = {
  active: { archivedAt: null },
  archived: { archivedAt: { not: null } },
  all: {},
} satisfies Record<LeadTab, Prisma.LeadWhereInput>;

export function getLeadListOrderBy(tab: LeadTab): Prisma.LeadOrderByWithRelationInput[] {
  if (tab === 'archived') {
    return [{ archivedAt: 'desc' }, { createdAt: 'desc' }];
  }

  return [
    { eventDate: { sort: 'asc', nulls: 'last' } },
    { createdAt: 'asc' },
  ];
}

export type LeadListResult = {
  leads: Prisma.LeadGetPayload<{ include: typeof leadListInclude }>[];
  counts: { active: number; archived: number; all: number };
};

export async function fetchLeadList(params: {
  tab: LeadTab;
  stage?: string | null;
  status?: string | null;
}): Promise<LeadListResult> {
  const stage = params.stage || null;
  const status = params.status || null;

  const [leads, active, archived, all] = await Promise.all([
    prisma.lead.findMany({
      where: buildLeadTabWhere(params.tab, stage, status),
      include: leadListInclude,
      orderBy: getLeadListOrderBy(params.tab),
    }),
    prisma.lead.count({ where: leadTabCountsWhere.active }),
    prisma.lead.count({ where: leadTabCountsWhere.archived }),
    prisma.lead.count({ where: leadTabCountsWhere.all }),
  ]);

  return {
    leads,
    counts: { active, archived, all },
  };
}
