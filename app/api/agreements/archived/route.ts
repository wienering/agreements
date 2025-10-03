import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const agreements = await prisma.agreement.findMany({
      where: {
        archived: true, // Only show archived agreements
      },
      include: {
        client: true,
        template: true,
      },
      orderBy: { archivedAt: 'desc' }
    });
    return NextResponse.json(agreements);
  } catch (error) {
    console.error('Error fetching archived agreements:', error);
    return NextResponse.json({ error: 'Failed to fetch archived agreements' }, { status: 500 });
  }
}
