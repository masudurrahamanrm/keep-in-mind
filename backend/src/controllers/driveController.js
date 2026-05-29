const { google } = require('googleapis');

/**
 * Helper to retry async operations
 */
const withRetry = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`[Drive Sync] Attempt ${attempt} failed, retrying... (${error.message})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
};

/**
 * @desc    Sync notes to Google Drive
 * @route   POST /api/drive/sync
 * @access  Private
 */
const syncToDrive = async (req, res) => {
  const { notes, googleAccessToken } = req.body;
  const userId = req.user ? req.user._id : 'Unknown';

  console.log('----------------------------------------');
  console.log('[Drive Sync] Starting Google Drive Sync');
  console.log('User:', userId);
  console.log('Access Token Valid:', !!googleAccessToken);
  console.log('Notes Found:', notes ? notes.length : 0);
  console.log('----------------------------------------');

  if (!notes || !Array.isArray(notes)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing or invalid notes array' 
    });
  }

  if (!googleAccessToken) {
    return res.status(401).json({ 
      success: false, 
      error: 'Missing Google Access Token' 
    });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: googleAccessToken });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Find or Create the 'Keep In Mind' Folder (with retries)
    let folderId;
    try {
      console.log('[Drive Sync] Verifying/Creating Keep In Mind folder...');
      const folderResponse = await withRetry(() => drive.files.list({
        q: "name = 'Keep In Mind' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id)',
        spaces: 'drive',
      }));

      if (folderResponse.data.files.length > 0) {
        folderId = folderResponse.data.files[0].id;
        console.log('Folder ID:', folderId, '(Existing)');
      } else {
        const folderMetadata = { name: 'Keep In Mind', mimeType: 'application/vnd.google-apps.folder' };
        const folder = await withRetry(() => drive.files.create({ resource: folderMetadata, fields: 'id' }));
        folderId = folder.data.id;
        console.log('Folder ID:', folderId, '(Created)');
      }
    } catch (folderErr) {
      console.error('[Drive Sync] Folder setup failed:', folderErr.message);
      // If folder creation fails, it's likely an auth issue or scope issue
      return res.status(500).json({
        success: false,
        error: 'Failed to access or create Google Drive folder',
        details: folderErr.message,
        stack: process.env.NODE_ENV === 'development' ? folderErr.stack : undefined
      });
    }

    // 2. Get existing note files in this folder to manage updates/deletions
    console.log('[Drive Sync] Fetching existing files map...');
    const existingFilesRes = await withRetry(() => drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType = 'text/plain'`,
      fields: 'files(id, name)',
      spaces: 'drive',
    }));
    
    const existingFiles = existingFilesRes.data.files || [];
    const existingFileMap = new Map(existingFiles.map(f => [f.name, f.id]));
    const processedFileNames = new Set();

    // 3. Sync each note
    let successCount = 0;
    let failCount = 0;
    const failedFiles = [];

    for (const note of notes) {
      // Step A: Validate Note Data
      if (!note.title && !note.content) {
        failCount++;
        failedFiles.push({ id: note._id || note.id, reason: 'Missing title and content' });
        continue;
      }
      
      const noteId = note._id || note.id;
      if (!noteId) {
        failCount++;
        failedFiles.push({ id: 'unknown', reason: 'Missing note ID' });
        continue;
      }

      console.log('Uploading:', note.title || 'Untitled');

      try {
        const safeTitle = (note.title || 'Untitled').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        const fileName = `${safeTitle}_${noteId}.txt`;
        processedFileNames.add(fileName);

        const metadata = {
          id: noteId,
          title: note.title,
          color: note.color,
          category: note.category,
          type: note.type,
          lastModified: new Date().toISOString()
        };

        const fileContent = `${note.content || ''}\n\n---\nMETADATA: ${JSON.stringify(metadata)}`;
        
        // Optional size validation (e.g. limit to 5MB text files)
        if (Buffer.byteLength(fileContent, 'utf8') > 5 * 1024 * 1024) {
           throw new Error('File size exceeds 5MB limit');
        }

        const media = { mimeType: 'text/plain', body: fileContent };

        // Step B: Upload or Update with Retry
        await withRetry(async () => {
          if (existingFileMap.has(fileName)) {
            await drive.files.update({
              fileId: existingFileMap.get(fileName),
              media: media,
            });
          } else {
            await drive.files.create({
              resource: { name: fileName, parents: [folderId], mimeType: 'text/plain' },
              media: media,
            });
          }
        });

        successCount++;
      } catch (fileErr) {
        failCount++;
        const errorReason = fileErr.response?.data?.error?.message || fileErr.message;
        console.error(`[Drive Sync] Failed for note ${note.title || 'Untitled'}:`, errorReason);
        failedFiles.push({ id: noteId, title: note.title, reason: errorReason });
      }
    }

    // 4. Cleanup old files (optional, best effort)
    for (const file of existingFiles) {
      if (!processedFileNames.has(file.name)) {
        try {
          await drive.files.delete({ fileId: file.id });
        } catch (delErr) {
          // Non-critical, ignore
        }
      }
    }

    console.log(`[Drive Sync] Complete. Success: ${successCount}, Failed: ${failCount}`);

    // Return detailed partial success format
    return res.status(200).json({ 
      success: true,
      uploaded: successCount,
      failed: failCount,
      failedFiles: failedFiles,
      message: `Synced ${successCount} notes! ${failCount > 0 ? `(${failCount} failed)` : ''} ☁️`
    });

  } catch (error) {
    console.error('[Drive Sync] Critical Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal Server Error during Drive Sync',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
