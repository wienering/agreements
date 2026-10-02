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

type RequestErrorContext = {
  routerKind: 'Pages Router' | 'App Router';
  routePath: string;
  routeType: 'render' | 'route' | 'action' | 'proxy';
};

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: RequestErrorContext,
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { reportServerError } = await import('./lib/errorAlert');
  await reportServerError({
    route: context.routePath || request.path,
    method: request.method,
    error,
  });
}
