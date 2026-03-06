/**
 * Next.js instrumentation - runs once when a server instance starts,
 * before it handles requests. Ensures Prisma engine is connected in
 * serverless environments (fixes "Engine is not yet connected" on cold start).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prisma } = await import('./lib/prisma');
    await prisma.$connect();
  }
}
