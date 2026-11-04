import { prisma } from '@/lib/prisma';
import { logAgreementActivity } from '@/lib/activityLog';
import { logEventActivity } from '@/lib/events/booking';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_AGREEMENT = 10;

export type BackdropWriteVia = 'admin' | 'client' | 'fallback' | 'proposed-match';

export function writableAgreementWhere(agreementId: string) {
  return {
    id: agreementId,
    archived: false,
    status: { not: 'CANCELLED' as const },
  };
}

/**
 * Where a backdrop choice is stored: the event (by its id, or the event of an agreement id).
 * Older agreements with no event keep it on the agreement.
 */
export async function resolveBackdropTarget(
  id: string,
): Promise<{ kind: 'event' | 'agreement'; id: string } | null> {
  const event = await prisma.event.findFirst({
    where: { id, archived: false, status: { not: 'CANCELLED' } },
    select: { id: true },
  });
  if (event) return { kind: 'event', id: event.id };
  const agreement = await prisma.agreement.findFirst({
    where: writableAgreementWhere(id),
    select: { id: true, eventId: true },
  });
  if (!agreement) return null;
  if (agreement.eventId) {
    const linked = await prisma.event.findFirst({
      where: { id: agreement.eventId, archived: false, status: { not: 'CANCELLED' } },
      select: { id: true },
    });
    return linked ? { kind: 'event', id: linked.id } : null;
  }
  return { kind: 'agreement', id: agreement.id };
}

async function isRateLimited(target: { kind: 'event' | 'agreement'; id: string }): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const count =
    target.kind === 'event'
      ? await prisma.eventActivity.count({ where: { eventId: target.id, type: 'BACKDROP_SELECTED', createdAt: { gte: since } } })
      : await prisma.agreementActivity.count({ where: { agreementId: target.id, type: 'BACKDROP_SELECTED', createdAt: { gte: since } } });
  return count >= RATE_LIMIT_MAX_PER_AGREEMENT;
}

/** `agreementIds` may hold event ids or agreement ids; each is stored on its event. */
export async function persistBackdropSelection(
  agreementIds: string[],
  backdropName: string | undefined,
  via: BackdropWriteVia,
): Promise<{ updatedCount: number; updatedAgreementIds: string[]; rateLimited: boolean }> {
  const normalizedName = backdropName ? backdropName : null;
  const updatedAgreementIds: string[] = [];
  const done = new Set<string>();

  for (const rawId of agreementIds) {
    const target = await resolveBackdropTarget(rawId);
    if (!target || done.has(`${target.kind}:${target.id}`)) continue;
    done.add(`${target.kind}:${target.id}`);

    if (await isRateLimited(target)) {
      return {
        updatedCount: updatedAgreementIds.length,
        updatedAgreementIds,
        rateLimited: true,
      };
    }

    if (target.kind === 'event') {
      await prisma.event.update({ where: { id: target.id }, data: { selectedBackdropName: normalizedName } });
      await logEventActivity(target.id, 'BACKDROP_SELECTED', { backdropName: normalizedName, via });
    } else {
      await prisma.agreement.update({ where: { id: target.id }, data: { selectedBackdropName: normalizedName } });
      await logAgreementActivity(target.id, 'BACKDROP_SELECTED', { backdropName: normalizedName, via });
    }

    updatedAgreementIds.push(target.id);
  }

  return {
    updatedCount: updatedAgreementIds.length,
    updatedAgreementIds,
    rateLimited: false,
  };
}
