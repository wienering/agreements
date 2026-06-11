import { AgreementActivityType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AgreementActivityMeta = Prisma.InputJsonValue;

export async function logAgreementActivity(
  agreementId: string,
  type: AgreementActivityType,
  meta?: AgreementActivityMeta,
): Promise<void> {
  try {
    await prisma.agreementActivity.create({
      data: {
        agreementId,
        type,
        ...(meta !== undefined ? { meta } : {}),
      },
    });
  } catch (error) {
    console.error('[activityLog] Failed to log agreement activity:', {
      agreementId,
      type,
      error,
    });
  }
}
