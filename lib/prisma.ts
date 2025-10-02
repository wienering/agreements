import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Test the connection
prisma.$connect().catch((error) => {
  console.error('Prisma connection error:', error);
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;



