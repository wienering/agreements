import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

// GET - Fetch all attendant groups
export async function GET() {
  try {

    await requireAdmin();
    const groups = await prisma.attendantGroup.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      groups,
    });
  } catch (error: any) {
    console.error('Error fetching attendant groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendant groups' },
      { status: 500 }
    );
  }
}

// POST - Create a new attendant group
export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const { name, slug, attendantIds } = body;

    if (!name || !slug || !Array.isArray(attendantIds)) {
      return NextResponse.json(
        { error: 'Name, slug, and attendantIds array are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingGroup = await prisma.attendantGroup.findUnique({
      where: { slug },
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: 'A group with this slug already exists' },
        { status: 400 }
      );
    }

    const group = await prisma.attendantGroup.create({
      data: {
        name,
        slug,
        attendantIds,
      },
    });

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error: any) {
    console.error('Error creating attendant group:', error);
    return NextResponse.json(
      { error: 'Failed to create attendant group' },
      { status: 500 }
    );
  }
}


