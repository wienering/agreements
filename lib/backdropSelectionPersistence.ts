import { prisma } from '@/lib/prisma';
import { logAgreementActivity } from '@/lib/activityLog';

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

async function isRateLimited(agreementId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const count = await prisma.agreementActivity.count({
    where: {
      agreementId,
      type: 'BACKDROP_SELECTED',
      createdAt: { gte: since },
    },
  });
  return count >= RATE_LIMIT_MAX_PER_AGREEMENT;
}

export async function persistBackdropSelection(
  agreementIds: string[],
  backdropName: string | undefined,
  via: BackdropWriteVia,
): Promise<{ updatedCount: number; updatedAgreementIds: string[]; rateLimited: boolean }> {
  const normalizedName = backdropName ? backdropName : null;
  const updatedAgreementIds: string[] = [];

  for (const agreementId of agreementIds) {
    if (await isRateLimited(agreementId)) {
      return {
        updatedCount: updatedAgreementIds.length,
        updatedAgreementIds,
        rateLimited: true,
      };
    }

    await prisma.agreement.update({
      where: { id: agreementId },
      data: { selectedBackdropName: normalizedName },
    });

    await logAgreementActivity(agreementId, 'BACKDROP_SELECTED', {
      backdropName: normalizedName,
      via,
    });

    updatedAgreementIds.push(agreementId);
  }

  return {
    updatedCount: updatedAgreementIds.length,
    updatedAgreementIds,
    rateLimited: false,
  };
}
