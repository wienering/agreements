import type { LeadListResult } from '@/lib/leads/query';
import type { FoldedLead } from '@/lib/leads/dedup';

export type LeadRecord = LeadListResult['leads'][number];

export type LeadTab = 'active' | 'archived' | 'all';

export type LeadCounts = LeadListResult['counts'];

export type ManualArchiveReason = 'booked' | 'lost' | 'manual';

export type FoldedLeadRecord = FoldedLead<LeadRecord>;
