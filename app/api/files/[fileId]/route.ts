import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFileFromDrive } from '@/lib/google-drive';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}

