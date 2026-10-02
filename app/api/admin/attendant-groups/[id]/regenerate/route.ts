import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { uniqueAttendantGroupSlug } from '../../uniqueSlug';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Replace a group's hub slug with a new random one. Existing slugs are left alone until this is called.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existingGroup = await prisma.attendantGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: 'Attendant group not found' }, { status: 404 });
    }

    const slug = await uniqueAttendantGroupSlug(existingGroup.name);
    const group = await prisma.attendantGroup.update({
      where: { id },
      data: { slug },
    });

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error regenerating attendant group slug:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate hub link' },
      { status: 500 }
    );
  }
}
