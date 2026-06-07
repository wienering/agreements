import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {

    await requireAdmin();

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Leads needing follow-up: nextFollowUpAt past due, or no contact in 3+ days
    const leads = await prisma.lead.findMany({
      where: {
        stage: { notIn: ['COMPLETED', 'LOST'] },
        OR: [
          { nextFollowUpAt: { lte: now } },
          { lastContactedAt: { lt: threeDaysAgo } },
          {
            lastContactedAt: null,
            createdAt: { lt: threeDaysAgo },
          },
        ],
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        agreement: { select: { id: true, status: true, uniqueToken: true } },
      },
      orderBy: [{ nextFollowUpAt: 'asc' }, { lastContactedAt: 'asc' }],
    });

    return NextResponse.json(leads);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching follow-up leads:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-up leads' }, { status: 500 });
  }
}
