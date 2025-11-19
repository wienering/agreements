import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Readable } from 'stream';

let driveClient: ReturnType<typeof google.drive> | null = null;

/**
 * Get authenticated Google Drive client using Service Account
 */
export function getGoogleDriveClient() {
  if (driveClient) {
    return driveClient;
  }

  const serviceAccountKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKey) {
    throw new Error('Google Drive service account key is not configured. Please set GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY environment variable with the JSON key content.');
  }

  let credentials;
  try {
    // Try to parse as JSON string first
    credentials = typeof serviceAccountKey === 'string' 
      ? JSON.parse(serviceAccountKey) 
      : serviceAccountKey;
  } catch (error) {
    throw new Error('Invalid service account key format. Must be valid JSON. Make sure to escape quotes if pasting directly, or use a file path.');
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Service account key is missing required fields (client_email or private_key).');
  }

  const jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  driveClient = google.drive({
    version: 'v3',
    auth: jwtClient,
  });

  return driveClient;
}

/**
 * Sanitize folder name by removing special characters
 */
function sanitizeFolderName(name: string): string {
  // Remove special characters and replace spaces with underscores
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find or create a client folder in Google Drive
 */
export async function findOrCreateClientFolder(clientName: string): Promise<string> {
  const drive = getGoogleDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';
  const sanitizedName = sanitizeFolderName(clientName);

  // First, try to find the "Client Files" folder in root
  let clientFilesFolderId: string | null = null;
  
  try {
    const clientFilesQuery = `name='Client Files' and mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`;
    const clientFilesResponse = await drive.files.list({
      q: clientFilesQuery,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (clientFilesResponse.data.files && clientFilesResponse.data.files.length > 0) {
      clientFilesFolderId = clientFilesResponse.data.files[0].id || null;
    } else {
      // Create "Client Files" folder if it doesn't exist
      const folderMetadata = {
        name: 'Client Files',
        mimeType: 'application/vnd.google-apps.folder',
        parents: rootFolderId !== 'root' ? [rootFolderId] : undefined,
      };

      const createResponse = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      clientFilesFolderId = createResponse.data.id || null;
    }
  } catch (error) {
    console.error('Error finding/creating Client Files folder:', error);
    // If root folder doesn't exist or we can't create Client Files folder, use root
    clientFilesFolderId = rootFolderId;
  }

  if (!clientFilesFolderId) {
    throw new Error('Failed to find or create Client Files folder');
  }

  // Now find or create the client-specific folder
  const clientFolderQuery = `name='${sanitizedName}' and mimeType='application/vnd.google-apps.folder' and '${clientFilesFolderId}' in parents and trashed=false`;
  
  try {
    const response = await drive.files.list({
      q: clientFolderQuery,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      // Folder exists, return its ID
      return response.data.files[0].id || '';
    }

    // Folder doesn't exist, create it
    const folderMetadata = {
      name: sanitizedName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [clientFilesFolderId],
    };

    const createResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    const folderId = createResponse.data.id;
    if (!folderId) {
      throw new Error('Failed to create client folder');
    }

    return folderId;
  } catch (error) {
    console.error('Error finding/creating client folder:', error);
    throw new Error(`Failed to find or create folder for client: ${clientName}`);
  }
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  folderId: string,
  mimeType?: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getGoogleDriveClient();

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    // Convert Buffer to Stream
    const stream = Readable.from(fileBuffer);

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('Failed to upload file to Google Drive');
    }

    // Make the file publicly viewable (or at least accessible with link)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the shareable link
    const webViewLink = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    
    return {
      fileId,
      webViewLink,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a shareable link for a file
 */
export async function getFileLink(fileId: string): Promise<string> {
  const drive = getGoogleDriveClient();

  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink, webContentLink',
    });

    return response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  } catch (error) {
    console.error('Error getting file link:', error);
    // Return a basic link even if API call fails
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getGoogleDriveClient();

  try {
    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error) {
    console.error('Error deleting file from Google Drive:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

