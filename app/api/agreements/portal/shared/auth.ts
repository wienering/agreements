import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface SessionWithClient {
  id: string;
  sessionToken: string;
  expiresAt: Date;
  lastActivityAt: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    address: string | null;
    phoneAddedAt: Date | null;
    addressAddedAt: Date | null;
    [key: string]: any;
  };
}

/**
 * Authenticate and validate session from Authorization header
 * Returns the session with client data if valid, or an error response if invalid
 */
export async function authenticateSession(
  request: NextRequest
): Promise<
  | { session: SessionWithClient; error: null }
  | { session: null; error: NextResponse }
> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      session: null,
      error: NextResponse.json(
        {
          error: 'Authorization header required',
          code: 'MISSING_AUTH',
        },
        { status: 401 }
      ),
    };
  }

  const sessionToken = authHeader.substring(7);

  try {
    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true,
      },
    });

    if (!session) {
      return {
        session: null,
        error: NextResponse.json(
          {
            error: 'Invalid session token',
            code: 'INVALID_SESSION',
          },
          { status: 401 }
        ),
      };
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.clientSession.delete({
        where: { sessionToken },
      });

      return {
        session: null,
        error: NextResponse.json(
          {
            error: 'Session has expired',
            code: 'SESSION_EXPIRED',
          },
          { status: 401 }
        ),
      };
    }

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() },
    });

    return {
      session: session as SessionWithClient,
      error: null,
    };
  } catch (error) {
    console.error('Error authenticating session:', error);
    return {
      session: null,
      error: NextResponse.json(
        {
          error: 'Authentication failed',
          code: 'AUTH_ERROR',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Wrapper function to handle authenticated route handlers
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, session: SessionWithClient) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const authResult = await authenticateSession(request);
    
    if (authResult.error) {
      return authResult.error;
    }

    return handler(request, authResult.session!);
  };
}

