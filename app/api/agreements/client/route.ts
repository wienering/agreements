import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    devLog('🔍 API: Looking for agreement with token:', token);

    if (!token) {
      devLog('❌ API: No token provided');
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: token,
        OR: [
          { status: { in: ['SIGNED', 'COMPLETED'] } }, // Signed/completed bypass expiration
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      select: { id: true },
    });

    devLog('📊 API: Agreement found:', !!agreement);

    if (!agreement) {
      devLog('❌ API: Agreement not found or expired');
      return NextResponse.json({ error: 'Agreement not found or expired' }, { status: 404 });
    }

    // Full agreement data is only returned after email verification via POST /api/agreements/verify-email
    return NextResponse.json({ exists: true, requiresVerification: true });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 });
  }
}
