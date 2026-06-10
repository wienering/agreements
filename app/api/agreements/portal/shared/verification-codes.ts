import { prisma } from '@/lib/prisma';

export const verificationCodeStore = {
  set: async (email: string, code: string, expiresAt: Date) => {
    const emailLower = email.toLowerCase();
    await prisma.portalOtpVerification.upsert({
      where: { email: emailLower },
      create: {
        email: emailLower,
        code,
        expiresAt,
        failedAttempts: 0,
      },
      update: {
        code,
        expiresAt,
        failedAttempts: 0,
      },
    });
  },

  get: async (email: string) => {
    const record = await prisma.portalOtpVerification.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!record) return undefined;
    return { code: record.code, expiresAt: record.expiresAt };
  },

  delete: async (email: string) => {
    await prisma.portalOtpVerification.deleteMany({
      where: { email: email.toLowerCase() },
    });
  },
};
