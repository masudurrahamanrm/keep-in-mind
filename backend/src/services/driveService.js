const { google } = require('googleapis');
const User = require('../models/User');

const FOLDERS = [
  'Government IDs',
  'Education',
  'Medical',
  'Banking',
  'Property',
  'Others',
  'Notes',
  'Backups',
  'Encrypted'
];

/**
 * Creates an OAuth2 client for a specific user
 */
const getDriveClient = (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NODE_ENV === 'production' ? 'https://keep-in-mind-1.onrender.com/api/auth/google/callback' : 'http://localhost:5000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Creates a folder in Google Drive
 */
const createDriveFolder = async (drive, name, parentId = null) => {
  const fileMetadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    return file.data.id;
  } catch (error) {
    console.error(`Error creating folder ${name}:`, error.message);
    throw error;
  }
};

/**
 * Asynchronously initializes the KeepInMind folder structure
 */
const initializeUserDrive = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.googleAccessToken) {
      console.log(`User ${userId} lacks Google tokens. Skipping Drive init.`);
      return;
    }

    if (user.rootFolderId) {
      console.log(`User ${userId} already has a root folder. Skipping init.`);
      return;
    }

    console.log(`Starting Drive initialization for User ${userId}...`);
    const drive = getDriveClient(user);

    // Create Root Folder
    const rootFolderId = await createDriveFolder(drive, 'KeepInMind');
    user.rootFolderId = rootFolderId;
    await user.save(); // Save early so we don't recreate the root folder if subfolders fail

    // Create Subfolders Concurrently
    const folderPromises = FOLDERS.map(async (folderName) => {
      const folderId = await createDriveFolder(drive, folderName, rootFolderId);
      return { name: folderName, id: folderId };
    });

    const results = await Promise.allSettled(folderPromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { name, id } = result.value;
        const fieldName = name.replace(/\s+/g, '').toLowerCase() + 'FolderId'; // e.g. governmentidsFolderId
        // Normalizing the field name mapping to match the schema
        const schemaFieldMap = {
          'Government IDs': 'governmentFolderId',
          'Education': 'educationFolderId',
          'Medical': 'medicalFolderId',
          'Banking': 'bankingFolderId',
          'Property': 'propertyFolderId',
          'Others': 'othersFolderId',
          'Notes': 'notesFolderId',
          'Backups': 'backupsFolderId',
          'Encrypted': 'encryptedFolderId'
        };
        const exactField = schemaFieldMap[name];
        if (exactField) {
          user[exactField] = id;
        }
      } else {
        console.error('Failed to create a subfolder:', result.reason);
      }
    });

    await user.save();
    console.log(`Successfully initialized Drive folders for User ${userId}`);
    
  } catch (error) {
    console.error(`Fatal error in initializeUserDrive for ${userId}:`, error.message);
  }
};

/**
 * Uploads a file buffer to Google Drive in the specified category folder
 */
const uploadFileToDrive = async (userId, fileBuffer, originalName, mimeType, category) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.googleAccessToken) {
      throw new Error('User lacks Google tokens');
    }

    const drive = getDriveClient(user);

    // Map category to the exact field name in schema
    const schemaFieldMap = {
      'Government IDs': 'governmentFolderId',
      'Education': 'educationFolderId',
      'Medical': 'medicalFolderId',
      'Banking': 'bankingFolderId',
      'Property': 'propertyFolderId',
      'Others': 'othersFolderId',
      'Notes': 'notesFolderId',
      'Backups': 'backupsFolderId',
      'Encrypted': 'encryptedFolderId',
      'KeepInMind': 'rootFolderId'
    };

    const targetField = schemaFieldMap[category] || schemaFieldMap['Others'];
    const parentFolderId = user[targetField];

    if (!parentFolderId) {
      throw new Error(`Folder ID for category "${category}" not found. User might need to re-login to initialize folders.`);
    }

    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const fileMetadata = {
      name: originalName,
      parents: [parentFolderId]
    };

    const media = {
      mimeType: mimeType,
      body: stream
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, iconLink, thumbnailLink'
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading file to Drive:', error.message);
    throw error;
  }
};

/**
 * Renames a file in Google Drive
 */
const renameFileInDrive = async (user, fileId, newName) => {
  try {
    if (!user || !user.googleAccessToken) throw new Error('Missing Google tokens');
    const drive = getDriveClient(user);
    await drive.files.update({
      fileId,
      requestBody: { name: newName }
    });
  } catch (error) {
    console.error(`Error renaming file ${fileId} in Drive:`, error.message);
    throw error;
  }
};

/**
 * Permanently deletes a file from Google Drive
 */
const deleteFileFromDrive = async (user, fileId) => {
  try {
    if (!user || !user.googleAccessToken) throw new Error('Missing Google tokens');
    const drive = getDriveClient(user);
    await drive.files.delete({ fileId });
  } catch (error) {
    console.warn(`Could not delete file ${fileId} from Drive (may already be deleted):`, error.message);
  }
};

module.exports = {
  getDriveClient,
  initializeUserDrive,
  createDriveFolder,
  uploadFileToDrive,
  renameFileInDrive,
  deleteFileFromDrive
};
