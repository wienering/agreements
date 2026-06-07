import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

export class AdminAuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export async function requireAdmin(): Promise<Session> {
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
  return null;
}
