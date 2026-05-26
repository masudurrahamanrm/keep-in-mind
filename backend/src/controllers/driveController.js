const { google } = require('googleapis');

/**
 * @desc    Sync notes to Google Drive
 * @route   POST /api/drive/sync
 * @access  Private
 */
const syncToDrive = async (req, res) => {
  const { notes, googleAccessToken } = req.body;

  if (!notes || !googleAccessToken) {
    return res.status(400).json({ message: 'Missing notes or access token' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: googleAccessToken });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Find or Create the 'Keep In Mind' Folder
    let folderId;
    const folderResponse = await drive.files.list({
      q: "name = 'Keep In Mind' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (folderResponse.data.files.length > 0) {
      folderId = folderResponse.data.files[0].id;
    } else {
      const folderMetadata = { name: 'Keep In Mind', mimeType: 'application/vnd.google-apps.folder' };
      const folder = await drive.files.create({ resource: folderMetadata, fields: 'id' });
      folderId = folder.data.id;
    }

    // 2. Get existing note files in this folder to manage updates/deletions
    const existingFilesRes = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType = 'text/plain'`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const existingFiles = existingFilesRes.data.files;
    const existingFileMap = new Map(existingFiles.map(f => [f.name, f.id]));

    const processedFileNames = new Set();

    // 3. Sync each note
    let successCount = 0;
    let failCount = 0;

    // Use a loop to avoid hitting rate limits too hard, but isolate errors
    for (const note of notes) {
      try {
        // Create a URL-safe name based on title and ID
        const safeTitle = (note.title || 'Untitled').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const fileName = `${safeTitle}_${note.id}.txt`;
        processedFileNames.add(fileName);

        const metadata = {
          id: note.id,
          title: note.title,
          color: note.color,
          category: note.category,
          type: note.type,
          lastModified: new Date().toISOString()
        };

        const fileContent = `${note.content}\n\n---\nMETADATA: ${JSON.stringify(metadata)}`;
        const media = { mimeType: 'text/plain', body: fileContent };

        if (existingFileMap.has(fileName)) {
          // Update
          await drive.files.update({
            fileId: existingFileMap.get(fileName),
            media: media,
          });
        } else {
          // Create
          await drive.files.create({
            resource: { name: fileName, parents: [folderId], mimeType: 'text/plain' },
            media: media,
          });
        }
        successCount++;
      } catch (fileErr) {
        failCount++;
        console.error(`[Drive Sync] Failed for note ${note.title || 'Untitled'} (${note.id}):`, fileErr.message);
        // Continue to next note
      }
    }

    if (failCount > 0 && successCount === 0) {
      throw new Error(`Failed to sync all ${failCount} notes. Last error check logs.`);
    }

    // 4. Cleanup: Delete files that are no longer in our notes list
    for (const file of existingFiles) {
      if (!processedFileNames.has(file.name)) {
        try {
          console.log(`Deleting removed note from Drive: ${file.name}`);
          await drive.files.delete({ fileId: file.id });
        } catch (delErr) {
          if (delErr.code === 403) {
            console.warn(`Permission denied to delete file: ${file.name}. It might not have been created by this app.`);
          } else {
            console.error(`Failed to delete file ${file.name}:`, delErr.message);
          }
        }
      }
    }

    res.json({ 
      message: `Synced ${successCount} notes! ${failCount > 0 ? `(${failCount} failed)` : ''} ☁️`,
      successCount,
      failCount 
    });
  } catch (error) {
    console.error('Google Drive Multi-Sync Error:', error);
    res.status(500).json({ message: 'Failed to sync individual files', error: error.message });
  }
};

/**
 * @desc    Fetch notes from Google Drive
 * @route   POST /api/drive/fetch
 * @access  Private
 */
const fetchFromDrive = async (req, res) => {
  const { googleAccessToken } = req.body;

  if (!googleAccessToken) {
    return res.status(400).json({ message: 'Missing access token' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: googleAccessToken });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Find the 'Keep In Mind' Folder
    const folderResponse = await drive.files.list({
      q: "name = 'Keep In Mind' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (folderResponse.data.files.length === 0) {
      return res.status(404).json({ message: 'No backup folder found.' });
    }

    const folderId = folderResponse.data.files[0].id;

    // 2. List all .txt files in the folder
    const listResponse = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType = 'text/plain'`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = listResponse.data.files;
    if (files.length === 0) {
      return res.status(404).json({ message: 'No backup files found in folder.' });
    }

    const notes = [];

    // 3. Download and parse each file
    for (const file of files) {
      const response = await drive.files.get({
        fileId: file.id,
        alt: 'media',
      });

      const rawContent = response.data;
      
      // Parse metadata from the bottom of the file
      const match = rawContent.match(/---[\r\n]+METADATA: (\{.*\})/s);
      
      if (match && match[1]) {
        try {
          const metadata = JSON.parse(match[1]);
          const content = rawContent.split('---')[0].trim();
          
          notes.push({
            ...metadata,
            content: content
          });
        } catch (e) {
          console.warn(`Could not parse metadata for file ${file.name}`);
        }
      }
    }

    // Sort by id or date if needed
    notes.sort((a, b) => b.id - a.id);

    res.json({ notes, lastSynced: new Date().toISOString() });
  } catch (error) {
    console.error('Google Drive Multi-Fetch Error:', error);
    res.status(500).json({ message: 'Failed to fetch files from Google Drive', error: error.message });
  }
};

/**
 * @desc    Get Google Drive storage quota + Keep In Mind app usage
 * @route   POST /api/drive/storage
 * @access  Private
 */
const getStorageQuota = async (req, res) => {
  const { googleAccessToken } = req.body;
  if (!googleAccessToken) {
    return res.status(400).json({ message: 'Missing access token' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: googleAccessToken });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Get total Drive quota (requires drive.metadata.readonly — may be restricted)
    //    Gracefully degrade if token doesn't have that scope.
    let totalBytes   = null;
    let usedBytes    = 0;
    let driveBytes   = 0;
    let trashBytes   = 0;
    let isUnlimited  = false;

    try {
      const aboutRes = await drive.about.get({ fields: 'storageQuota' });
      const quota    = aboutRes.data.storageQuota || {};
      const FIFTEEN_GB = 15 * 1024 * 1024 * 1024;
      const rawLimit   = quota.limit ? parseInt(quota.limit, 10) : null;
      totalBytes  = rawLimit || FIFTEEN_GB;
      usedBytes   = quota.usage             ? parseInt(quota.usage,             10) : 0;
      driveBytes  = quota.usageInDrive      ? parseInt(quota.usageInDrive,      10) : 0;
      trashBytes  = quota.usageInDriveTrash ? parseInt(quota.usageInDriveTrash, 10) : 0;
      isUnlimited = !rawLimit;
    } catch (quotaErr) {
      console.warn('Drive quota info unavailable (scope may be restricted):', quotaErr.message);
      // Continue — we can still show app-specific usage
    }

    // 2. Find the Keep In Mind folder and scan its full hierarchy
    let appUsedBytes = 0;
    let appFileCount = 0;

    try {
      const rootRes = await drive.files.list({
        q: "(name = 'Keep In Mind' or name = 'KeepInMind') and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id)',
      });

      if (rootRes.data.files && rootRes.data.files.length > 0) {
        const rootIds = rootRes.data.files.map(f => f.id);
        
        // Find subfolders too (like Gallery, Government IDs, etc)
        const subfolderPromises = rootIds.map(rootId => 
          drive.files.list({
            q: `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
          })
        );
        
        const subfolderResponses = await Promise.all(subfolderPromises);
        let allFolderIds = [...rootIds];
        
        subfolderResponses.forEach(res => {
          if (res.data.files) {
            allFolderIds.push(...res.data.files.map(f => f.id));
          }
        });

        for (const fid of allFolderIds) {
          const filesRes = await drive.files.list({
            q: `'${fid}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'files(id, size)',
            spaces: 'drive',
          });

          if (filesRes.data.files) {
            appFileCount += filesRes.data.files.length;
            for (const file of filesRes.data.files) {
              appUsedBytes += parseInt(file.size || '0', 10);
            }
          }
        }
      }
    } catch (folderErr) {
      console.warn('Drive deep scan failed:', folderErr.message);
    }

    const freeBytesValue = totalBytes ? Math.max(0, totalBytes - usedBytes) : 0;

    res.json({
      totalBytes,
      usedBytes,
      driveBytes,
      trashBytes,
      appUsedBytes,
      appFileCount,
      freeBytes:   freeBytesValue,
      isUnlimited,
    });
  } catch (error) {
    console.error('Drive Storage Quota Error:', error.message);
    res.status(500).json({ message: 'Failed to fetch storage info', error: error.message });
  }
};

module.exports = { syncToDrive, fetchFromDrive, getStorageQuota };
