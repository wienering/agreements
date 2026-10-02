import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { uniqueAttendantGroupSlug } from './uniqueSlug';

// GET - Fetch all attendant groups
export async function GET(request: NextRequest) {
  try {

    await requireAdmin(request);
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
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
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

    await requireAdmin(request);
    const body = await request.json();
    const { name, attendantIds } = body;

    if (!name || typeof name !== 'string' || !name.trim() || !Array.isArray(attendantIds)) {
      return NextResponse.json(
        { error: 'Name and attendantIds array are required' },
        { status: 400 }
      );
    }

    const slug = await uniqueAttendantGroupSlug(name);

    const group = await prisma.attendantGroup.create({
      data: {
        name: name.trim(),
        slug,
        attendantIds,
      },
    });

    return NextResponse.json({
      success: true,
      group,
    });
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error creating attendant group:', error);
    return NextResponse.json(
      { error: 'Failed to create attendant group' },
      { status: 500 }
    );
  }
}


