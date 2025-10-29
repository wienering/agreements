import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required' 
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and delete session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Delete the session
    await prisma.clientSession.delete({
      where: { sessionToken }
    });

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ 
      error: 'Failed to log out' 
    }, { status: 500 });
  }
}
