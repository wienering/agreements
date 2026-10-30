import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { deleteFileFromDrive } from '@/lib/google-drive';

// Assigns a file to one of its client's events
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {

    await requireAdmin(request);

    const { fileId } = await params;
    const body = await request.json().catch(() => null);
    const eventId = typeof body?.eventId === 'string' ? body.eventId : null;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const clientFile = await prisma.clientFile.findUnique({
      where: { id: fileId },
      select: { id: true, clientId: true },
    });

    if (!clientFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, clientId: true },
    });

    if (!event || event.clientId !== clientFile.clientId) {
      return NextResponse.json(
        { error: 'Event not found for this client' },
        { status: 400 }
      );
    }

    await prisma.clientFile.update({
      where: { id: fileId },
      data: { eventId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error assigning file to event:', error);
    return NextResponse.json(
      { error: 'Failed to assign file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {

    await requireAdmin(request);

    const { fileId } = await params;

    // Get the file record from database
    const clientFile = await prisma.clientFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        googleDriveFileId: true,
        fileName: true,
      },
    });

    if (!clientFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete from Google Drive first
    try {
      await deleteFileFromDrive(clientFile.googleDriveFileId);
    } catch (error: any) {
      console.error('Error deleting file from Google Drive:', error);
      // Continue to delete from database even if Drive deletion fails
      // (file might already be deleted from Drive)
    }

    // Delete from database
    await prisma.clientFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

