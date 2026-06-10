import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuthResponse } from '@/lib/requireAdmin';

export function formatZodDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export function handleApiError(error: unknown, routeLabel?: string): NextResponse {
  const label = routeLabel ? `[${routeLabel}] ` : '';

  const authResponse = adminAuthResponse(error);
  if (authResponse) {
    return authResponse;
  }

  if (error instanceof z.ZodError) {
    console.error(`${label}Validation error:`, error);
    const details = formatZodDetails(error);
    return NextResponse.json(
      { error: 'Invalid request data', details },
      { status: 400 },
    );
  }

  console.error(`${label}Unhandled error:`, error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
