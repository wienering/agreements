import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {

    await requireAdmin();
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
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching archived agreements:', error);
    return NextResponse.json({ error: 'Failed to fetch archived agreements' }, { status: 500 });
  }
}
