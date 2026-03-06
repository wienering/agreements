import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateClientFolder, uploadFileToDrive } from '@/lib/google-drive';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.zip', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

function isValidFileType(fileName: string, mimeType: string): boolean {
  // Check by extension
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return false;
  }

  // Check by MIME type
  return ALLOWED_FILE_TYPES.includes(mimeType.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('clientId') as string;
    const eventId = formData.get('eventId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidFileType(file.name, file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only ZIP and image files (JPG, PNG, GIF, WEBP) are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Verify event exists if eventId is provided
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, clientId: true },
      });

      if (!event) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      if (event.clientId !== clientId) {
        return NextResponse.json(
          { error: 'Event does not belong to the specified client' },
          { status: 400 }
        );
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Get or create client folder
    const clientFullName = `${client.firstName} ${client.lastName}`;
    const folderId = await findOrCreateClientFolder(clientFullName);

    // Upload file to Google Drive
    const uploadResult = await uploadFileToDrive(
      fileBuffer,
      file.name,
      folderId,
      file.type
    );

    // Save file metadata to database
    const clientFile = await prisma.clientFile.create({
      data: {
        clientId: clientId,
        eventId: eventId || null,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        googleDriveFileId: uploadResult.fileId,
        googleDriveLink: uploadResult.webViewLink,
        googleDriveFolderId: folderId,
        uploadedBy: session.user.email || null,
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        event: {
          select: {
            id: true,
            eventDate: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: clientFile.id,
        fileName: clientFile.fileName,
        fileType: clientFile.fileType,
        fileSize: clientFile.fileSize,
        googleDriveLink: clientFile.googleDriveLink,
        createdAt: clientFile.createdAt,
        client: clientFile.client,
        event: clientFile.event,
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

