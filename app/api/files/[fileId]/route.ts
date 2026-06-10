import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { deleteFileFromDrive } from '@/lib/google-drive';

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

