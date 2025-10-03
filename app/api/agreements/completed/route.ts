import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const agreements = await prisma.agreement.findMany({
      where: {
        status: 'COMPLETED',
        archived: false, // Don't show archived completed agreements
      },
      include: {
        client: true,
        template: true,
      },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(agreements);
  } catch (error) {
    console.error('Error fetching completed agreements:', error);
    return NextResponse.json({ error: 'Failed to fetch completed agreements' }, { status: 500 });
  }
}
