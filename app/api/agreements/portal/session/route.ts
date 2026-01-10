import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: {
          include: {
            agreements: {
              include: {
                template: true
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    // Check if client is loaded
    if (!session.client) {
      return NextResponse.json({ 
        error: 'Invalid session - no client associated',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 401 });
    }

    // Extract client to preserve TypeScript type narrowing
    const sessionClient = session.client;

    // Auto-refresh session if it expires within 15 minutes
    const now = new Date();
    const timeUntilExpiry = session.expiresAt.getTime() - now.getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    
    let newExpiresAt = session.expiresAt;
    let sessionRefreshed = false;

    if (timeUntilExpiry < fifteenMinutes) {
      // Extend session by 90 minutes from now
      newExpiresAt = new Date(now.getTime() + 90 * 60 * 1000);
      sessionRefreshed = true;
    }

    // Update session with new expiry and activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { 
        lastActivityAt: new Date(),
        expiresAt: newExpiresAt
      }
    });

    // Calculate session info
    const sessionInfo = {
      token: sessionToken,
      expiresAt: newExpiresAt,
      lastActivityAt: new Date(),
      refreshed: sessionRefreshed,
      timeUntilExpiry: newExpiresAt.getTime() - now.getTime(),
      expiresInMinutes: Math.floor((newExpiresAt.getTime() - now.getTime()) / (1000 * 60))
    };

    return NextResponse.json({
      success: true,
      session: sessionInfo,
      client: {
        id: sessionClient.id,
        firstName: sessionClient.firstName,
        lastName: sessionClient.lastName,
        email: sessionClient.email,
        phone: sessionClient.phone,
        address: sessionClient.address,
        phoneAddedAt: sessionClient.phoneAddedAt,
        addressAddedAt: sessionClient.addressAddedAt,
        agreementsCount: sessionClient.agreements.length,
        // Add client preferences for frontend
        preferences: {
          autoRefresh: true,
          notifications: true,
          theme: 'light' // Could be stored in database later
        }
      }
    });

  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json({ 
      error: 'Failed to validate session',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

// Add endpoint to manually refresh session
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    // Extend session by 90 minutes
    const newExpiresAt = new Date(Date.now() + 90 * 60 * 1000);

    await prisma.clientSession.update({
      where: { sessionToken },
      data: { 
        lastActivityAt: new Date(),
        expiresAt: newExpiresAt
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Session refreshed successfully',
      session: {
        token: sessionToken,
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
        expiresInMinutes: 90
      }
    });

  } catch (error) {
    console.error('Error refreshing session:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh session',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}