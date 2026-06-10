import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch a specific attendant group
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {

    await requireAdmin();
    const { id } = await params;
    
    const group = await prisma.attendantGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Attendant group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error: any) {
    console.error('Error fetching attendant group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendant group' },
      { status: 500 }
    );
  }
}

// PUT - Update an attendant group
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {

    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { name, slug, attendantIds } = body;

    // Check if group exists
    const existingGroup = await prisma.attendantGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Attendant group not found' },
        { status: 404 }
      );
    }

    // If slug is being changed, check if new slug already exists
    if (slug && slug !== existingGroup.slug) {
      const slugExists = await prisma.attendantGroup.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A group with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (attendantIds !== undefined) updateData.attendantIds = attendantIds;

    const group = await prisma.attendantGroup.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error: any) {
    console.error('Error updating attendant group:', error);
    return NextResponse.json(
      { error: 'Failed to update attendant group' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an attendant group
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {

    await requireAdmin();
    const { id } = await params;

    // Check if group exists
    const existingGroup = await prisma.attendantGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Attendant group not found' },
        { status: 404 }
      );
    }

    await prisma.attendantGroup.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendant group deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting attendant group:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendant group' },
      { status: 500 }
    );
  }
}


