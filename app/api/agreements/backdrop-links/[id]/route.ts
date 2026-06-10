import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';

const updateBackdropLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less').optional(),
  url: z.string().url('Invalid URL').optional(),
  displayOrder: z.number().int().optional(),
});

// PUT - Update backdrop link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateBackdropLinkSchema.parse(body);

    // Check if backdrop link exists
    const existingLink = await prisma.backdropLink.findUnique({
      where: { id }
    });

    if (!existingLink) {
      return NextResponse.json({ 
        error: 'Backdrop link not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    
    if (validatedData.url !== undefined) {
      updateData.url = validatedData.url;
    }
    
    if (validatedData.displayOrder !== undefined) {
      updateData.displayOrder = validatedData.displayOrder;
    }

    // Update the backdrop link
    const updatedLink = await prisma.backdropLink.update({
      where: { id },
      data: updateData
    });

    devLog('Updated backdrop link:', updatedLink.id);
    return NextResponse.json({
      success: true,
      backdropLink: updatedLink
    });

  } catch (error) {
    return handleApiError(error, 'agreements/backdrop-links/[id]');
  }
}

// DELETE - Delete backdrop link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    await requireAdmin();
    const { id } = await params;

    // Check if backdrop link exists
    const existingLink = await prisma.backdropLink.findUnique({
      where: { id }
    });

    if (!existingLink) {
      return NextResponse.json({ 
        error: 'Backdrop link not found' 
      }, { status: 404 });
    }

    // Check if any agreements are using this backdrop link
    const agreementsUsingLink = await prisma.agreement.count({
      where: { backdropLinkId: id }
    });

    if (agreementsUsingLink > 0) {
      return NextResponse.json({ 
        error: `Cannot delete backdrop link. It is currently being used by ${agreementsUsingLink} agreement(s).`,
        agreementsCount: agreementsUsingLink
      }, { status: 400 });
    }

    // Delete the backdrop link
    await prisma.backdropLink.delete({
      where: { id }
    });

    devLog('Deleted backdrop link:', id);
    return NextResponse.json({
      success: true,
      message: 'Backdrop link deleted successfully'
    });

  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error deleting backdrop link:', error);
    return NextResponse.json({ 
      error: 'Failed to delete backdrop link' 
    }, { status: 500 });
  }
}

