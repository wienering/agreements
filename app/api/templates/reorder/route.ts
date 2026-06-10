import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const { templateIds } = body;

    // Validate that templateIds is an array
    if (!Array.isArray(templateIds)) {
      return NextResponse.json({ error: 'templateIds must be an array' }, { status: 400 });
    }

    // Update the order of each template
    const updatePromises = templateIds.map((templateId: string, index: number) => 
      prisma.template.update({
        where: { id: templateId },
        data: { order: index }
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error reordering templates:', error);
    return NextResponse.json({ error: 'Failed to reorder templates' }, { status: 500 });
  }
}
