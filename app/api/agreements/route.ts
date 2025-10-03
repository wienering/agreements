import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const agreements = await prisma.agreement.findMany({
      where: {
        archived: false, // Only show non-archived agreements
      },
      include: {
        client: true,
        template: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(agreements);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    return NextResponse.json({ error: 'Failed to fetch agreements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, templateId, expiresAt } = body;

    // Validate required fields
    if (!clientId || !templateId) {
      return NextResponse.json({ error: 'Client ID and Template ID are required' }, { status: 400 });
    }

    // Generate unique token
    const uniqueToken = randomBytes(32).toString('hex');

    const agreement = await prisma.agreement.create({
      data: {
        clientId,
        templateId,
        uniqueToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'DRAFT',
      },
      include: {
        client: true,
        template: true,
      },
    });

    return NextResponse.json(agreement, { status: 201 });
  } catch (error) {
    console.error('Error creating agreement:', error);
    return NextResponse.json({ error: 'Failed to create agreement' }, { status: 500 });
  }
}
