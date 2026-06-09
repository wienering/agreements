import { drive_v3, drive as googleDrive } from '@googleapis/drive';
import { devLog } from './logger';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

let driveClient: drive_v3.Drive | null = null;

/**
 * Get authenticated Google Drive client using OAuth2
 */
export function getGoogleDriveClient() {
  if (driveClient) {
    return driveClient;
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive OAuth2 credentials are not configured. Please set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN environment variables.');
  }

  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Set up automatic token refresh with better error handling
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      // If we get a new refresh token, log it (user should update their env var)
      devLog('New refresh token received. Update GOOGLE_DRIVE_REFRESH_TOKEN in Vercel.');
    }
  });

  driveClient = googleDrive({
    version: 'v3',
    auth: oauth2Client,
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
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (!rootFolderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is required. Please create a folder in your Google Drive, share it with the service account, and set the folder ID.');
  }
  
  const sanitizedName = sanitizeFolderName(clientName);

  // First, try to find the "Client Files" folder in root
  let clientFilesFolderId: string | null = null;
  
  try {
    // Search in shared folders (folders shared with service account)
    const clientFilesQuery = `name='Client Files' and mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`;
    const clientFilesResponse = await drive.files.list({
      q: clientFilesQuery,
      fields: 'files(id, name)',
      spaces: 'drive',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: 'allDrives',
    });

    if (clientFilesResponse.data.files && clientFilesResponse.data.files.length > 0) {
      clientFilesFolderId = clientFilesResponse.data.files[0].id || null;
    } else {
      // Create "Client Files" folder if it doesn't exist
      const folderMetadata = {
        name: 'Client Files',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      };

      const createResponse = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
        supportsAllDrives: true,
      });

      clientFilesFolderId = createResponse.data.id || null;
    }
  } catch (error) {
    console.error('Error finding/creating Client Files folder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to access Google Drive folder (ID: ${rootFolderId}). Make sure the folder exists in your Google Drive and that your OAuth2 credentials are properly configured. Error: ${errorMessage}`);
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
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: 'allDrives',
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
      supportsAllDrives: true,
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
      supportsAllDrives: true,
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

