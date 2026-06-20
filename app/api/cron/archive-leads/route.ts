import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cronAuth';
import { getAutoArchiveReason, type ArchiveReason } from '@/lib/leads/archive';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';

// Vercel cron invokes this endpoint with GET (user agent: vercel-cron/1.0).
// Manual triggers can use POST. Both require the CRON_SECRET bearer token.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type AutoArchiveReason = Extract<ArchiveReason, 'booked' | 'lost' | 'event_passed' | 'stale'>;

const REASONS: AutoArchiveReason[] = ['booked', 'lost', 'event_passed', 'stale'];

async function runArchiveLeads() {
  const now = new Date();

  const leads = await prisma.lead.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      stage: true,
      eventDate: true,
      lastContactedAt: true,
      createdAt: true,
      eventId: true,
      archivedAt: true,
      agreement: { select: { id: true } },
    },
  });

  const idsByReason: Record<AutoArchiveReason, string[]> = {
    booked: [],
    lost: [],
    event_passed: [],
    stale: [],
  };

  for (const lead of leads) {
    let reason: AutoArchiveReason | null = null;

    if (lead.stage === 'SIGNED' || lead.stage === 'COMPLETED') {
      reason = 'booked';
    } else if (lead.stage === 'LOST') {
      reason = 'lost';
    } else {
      reason = getAutoArchiveReason(lead, now);
    }

    if (reason) {
      idsByReason[reason].push(lead.id);
    }
  }

  const byReason: Record<AutoArchiveReason, number> = {
    booked: 0,
    lost: 0,
    event_passed: 0,
    stale: 0,
  };

  const updates = REASONS.filter((reason) => idsByReason[reason].length > 0).map((reason) =>
    prisma.lead.updateMany({
      where: { id: { in: idsByReason[reason] }, archivedAt: null },
      data: { archivedAt: now, archiveReason: reason },
    }),
  );

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  for (const reason of REASONS) {
    byReason[reason] = idsByReason[reason].length;
  }

  const archived = REASONS.reduce((sum, reason) => sum + byReason[reason], 0);

  if (archived > 0) {
    await sendTelegramMessage(
      `Archived ${archived} leads (booked ${byReason.booked}, lost ${byReason.lost}, event passed ${byReason.event_passed}, stale ${byReason.stale})`,
    );
  }

  return { archived, byReason };
}

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runArchiveLeads();
    console.log('[archive-leads] completed', summary);
    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      ...summary,
    });
  } catch (error) {
    console.error('[archive-leads] failed', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
