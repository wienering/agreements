import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

const CSRF_HEADER = 'X-Requested-With';
const CSRF_VALUE = 'agreements-admin';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class AdminAuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export class CsrfError extends Error {
  constructor(message = 'Invalid request origin') {
    super(message);
    this.name = 'CsrfError';
  }
}

function checkCsrf(request?: NextRequest): void {
  const method = request?.method ?? 'GET';
  if (!STATE_CHANGING_METHODS.has(method)) {
    return;
  }

  if (!request) {
    return;
  }

  const headerValue = request.headers.get(CSRF_HEADER);
  const path = request.nextUrl.pathname;
  const csrfValid = headerValue === CSRF_VALUE;

  if (!csrfValid) {
    const enforce = process.env.CSRF_ENFORCE !== 'false';
    const logLine = `[CSRF] Missing or invalid ${CSRF_HEADER} header on ${method} ${path} (got: ${headerValue ?? 'none'})`;

    if (enforce) {
      throw new CsrfError();
    } else {
      console.warn(logLine);
    }
  }
}

export async function requireAdmin(request?: NextRequest): Promise<Session> {
  checkCsrf(request);

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new AdminAuthError();
  }

  const isAdmin =
    session.user.email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();

  if (!isAdmin) {
    throw new AdminAuthError();
  }

  return session;
}

export function adminAuthResponse(error: unknown): NextResponse | null {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (error instanceof CsrfError) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  return null;
}
