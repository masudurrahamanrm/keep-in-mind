const { google } = require('googleapis');
const Media = require('../models/Media');
const User = require('../models/User');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Upload media to Google Drive and save metadata
 * @route   POST /api/gallery/upload
 * @access  Private
 */
const uploadMedia = async (req, res) => {
  const { googleAccessToken } = req.body;
  const file = req.file;

  console.log('[Upload] Starting upload process...');
  if (!file) console.warn('[Upload] No file received in request.');
  if (!googleAccessToken) console.warn('[Upload] No Google Access Token received.');

  if (!file || !googleAccessToken) {
    return res.status(400).json({ message: 'Missing file or access token' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: googleAccessToken });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Get or Create the 'Keep In Mind' Folder
    console.log('[Upload] Checking for root folder...');
    let parentFolderId;
    const folderRes = await drive.files.list({
      q: "name = 'Keep In Mind' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (folderRes.data.files.length > 0) {
      parentFolderId = folderRes.data.files[0].id;
      console.log(`[Upload] Root folder found: ${parentFolderId}`);
    } else {
      console.log('[Upload] Creating root folder...');
      const folderMetadata = { name: 'Keep In Mind', mimeType: 'application/vnd.google-apps.folder' };
      const folder = await drive.files.create({ resource: folderMetadata, fields: 'id' });
      parentFolderId = folder.data.id;
      console.log(`[Upload] Created root folder: ${parentFolderId}`);
    }

    // 2. Get or Create the 'Gallery' Subfolder
    console.log('[Upload] Checking for Gallery subfolder...');
    let galleryFolderId;
    const galleryRes = await drive.files.list({
      q: `name = 'Gallery' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (galleryRes.data.files.length > 0) {
      galleryFolderId = galleryRes.data.files[0].id;
      console.log(`[Upload] Gallery folder found: ${galleryFolderId}`);
    } else {
      console.log('[Upload] Creating Gallery folder...');
      const galleryMetadata = {
        name: 'Gallery',
        parents: [parentFolderId],
        mimeType: 'application/vnd.google-apps.folder'
      };
      const galleryFolder = await drive.files.create({ resource: galleryMetadata, fields: 'id' });
      galleryFolderId = galleryFolder.data.id;
      console.log(`[Upload] Created Gallery folder: ${galleryFolderId}`);
    }

    // 3. Upload File to Drive
    console.log(`[Upload] Pushing ${file.originalname} to Drive...`);
    
    let mediaBody;
    if (file.buffer) {
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      mediaBody = bufferStream;
    } else if (file.path) {
      mediaBody = fs.createReadStream(file.path);
    } else {
      throw new Error('No file content found (neither buffer nor path)');
    }

    const driveFileRes = await drive.files.create({
      requestBody: {
        name: `${Date.now()}_${file.originalname}`,
        parents: [galleryFolderId],
        mimeType: file.mimetype
      },
      media: {
        mimeType: file.mimetype,
        body: mediaBody
      },
      fields: 'id, webContentLink, webViewLink, thumbnailLink'
    });

    const driveFile = driveFileRes.data;
    console.log(`[Upload] Drive file created: ${driveFile.id}`);

    // 4. Set permissions (Soft fail if organization blocks public sharing)
    try {
      await drive.permissions.create({
        fileId: driveFile.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });
    } catch (permErr) {
      console.warn(`[Upload] Could not set public permissions (likely organization restricted). Proceeding anyway. Error: ${permErr.message}`);
    }

    // 5. Save to MongoDB
    console.log('[Upload] Saving metadata to MongoDB...');
    const newMedia = new Media({
      userId: req.user._id,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileId: driveFile.id,
      fileUrl: driveFile.webViewLink,
      thumbnailUrl: driveFile.thumbnailLink,
      size: file.size
    });

    await newMedia.save();
    console.log(`[Upload] Success! ID: ${newMedia._id}`);

    // 6. Cleanup temp file
    if (file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('[Upload] Failed to delete temp file:', err);
      });
    }

    res.status(201).json({
      message: 'Upload successful! 🚀',
      media: newMedia
    });

  } catch (error) {
    console.error('[Upload Error] Details:', error.message);
    if (error.response) {
      console.error('[Upload Error] Google API Status:', error.response.status);
      console.error('[Upload Error] Google API Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('[Upload Error] Error Code:', error.code);
    }
    
    // Cleanup temp file on error
    if (file && file.path) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('[Upload] Failed to delete temp file on error:', err);
      });
    }

    const status = error.response?.status || error.code || 500;
    const googleError = error.response?.data?.error;
    res.status(typeof status === 'number' ? status : 500).json({
      message: 'Upload processing failed',
      error: error.message,
      googleError: googleError ? { code: googleError.code, message: googleError.message, reason: googleError.errors?.[0]?.reason } : undefined,
      data: error.response?.data
    });
  }
};

/**
 * @desc    Get all gallery media for user
 * @route   GET /api/gallery
 * @access  Private
 */
const getMediaList = async (req, res) => {
  try {
    const media = await Media.find({
      userId: req.user._id,
      isTrashed: { $ne: true } // Only active items
    }).sort({ uploadedAt: -1 });
    res.json(media);
  } catch (error) {
    console.error('Fetch Gallery Error:', error);
    res.status(500).json({ message: 'Failed to fetch gallery' });
  }
};

/**
 * @desc    Get all trashed media (Recycle Bin)
 * @route   GET /api/gallery/trash
 * @access  Private
 */
const getTrashedMedia = async (req, res) => {
  try {
    const media = await Media.find({
      userId: req.user._id,
      isTrashed: true
    }).sort({ deletedAt: -1 });
    res.json(media);
  } catch (error) {
    console.error('Fetch Trash Error:', error);
    res.status(500).json({ message: 'Failed to fetch recycle bin' });
  }
};

/**
 * @desc    Delete media from Drive and DB
 * @route   DELETE /api/gallery/:id
 * @access  Private
 */
const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findOne({ _id: req.params.id, userId: req.user._id });

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Soft Delete
    media.isTrashed = true;
    media.deletedAt = new Date();
    await media.save();

    res.json({ message: 'Moved to Trash 🗑️' });

  } catch (error) {
    console.error('Delete Media Error:', error);
    res.status(500).json({ message: 'Failed to move to trash' });
  }
};

/**
 * @desc    Restore media from Trash
 * @route   PATCH /api/gallery/:id/restore
 * @access  Private
 */
const restoreMedia = async (req, res) => {
  try {
    const media = await Media.findOne({ _id: req.params.id, userId: req.user._id });

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    media.isTrashed = false;
    media.deletedAt = undefined;
    await media.save();

    res.json({ message: 'Restored to Gallery ✨', media });

  } catch (error) {
    console.error('Restore Media Error:', error);
    res.status(500).json({ message: 'Restore failed' });
  }
};

/**
 * @desc    Permanently delete media from Drive and DB
 * @route   DELETE /api/gallery/:id/permanent
 * @access  Private
 */
const permanentDeleteMedia = async (req, res) => {
  const googleAccessToken = req.headers['google-access-token'];

  try {
    const media = await Media.findOne({ _id: req.params.id, userId: req.user._id });

    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    if (googleAccessToken) {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: googleAccessToken });
      const drive = google.drive({ version: 'v3', auth });

      try {
        await drive.files.delete({ fileId: media.fileId });
        console.log(`[Drive] Permanently deleted: ${media.fileId}`);
      } catch (driveErr) {
        console.warn('Could not delete from Drive, maybe already gone:', driveErr.message);
      }
    }

    await Media.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permanently deleted from cloud 🗑️🔥' });

  } catch (error) {
    console.error('Permanent Delete Error:', error);
    res.status(500).json({ message: 'Permanent deletion failed' });
  }
};

/**
 * @desc    Get aggregate gallery storage usage from Drive
 * @route   GET /api/gallery/storage
 * @access  Private
 */
const getGalleryStorage = async (req, res) => {
  const googleAccessToken = req.headers['google-access-token'];
  console.log('[Storage] Fetching totals...');

  if (!googleAccessToken) {
    console.warn('[Storage] Missing access token header.');
    return res.status(400).json({ message: 'Missing Google access token' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: googleAccessToken });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Find root folder
    const rootRes = await drive.files.list({
      q: "name = 'Keep In Mind' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (!rootRes.data.files || rootRes.data.files.length === 0) {
      console.log('[Storage] No app root folder found, returning zero.');
      return res.json({ totalSize: '0.00', totalFiles: 0 });
    }

    const rootId = rootRes.data.files[0].id;

    // 2. Find Gallery folder
    const galRes = await drive.files.list({
      q: `name = 'Gallery' and '${rootId}' in parents and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive',
    });

    const folderIds = [rootId];
    if (galRes.data.files && galRes.data.files.length > 0) {
      folderIds.push(galRes.data.files[0].id);
    }

    // 3. Sum all files in these folders
    let totalBytes = 0;
    let totalFiles = 0;

    for (const fid of folderIds) {
      const filesRes = await drive.files.list({
        q: `'${fid}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'files(id, size)',
        spaces: 'drive',
      });

      if (filesRes.data.files) {
        totalFiles += filesRes.data.files.length;
        for (const f of filesRes.data.files) {
          totalBytes += parseInt(f.size || '0', 10);
        }
      }
    }

    const sizeInMB = totalBytes / (1024 * 1024);
    const displaySize = sizeInMB > 1024
      ? `${(sizeInMB / 1024).toFixed(2)} GB`
      : `${sizeInMB.toFixed(2)} MB`;

    console.log(`[Storage] Calculation complete: ${displaySize} across ${totalFiles} files.`);
    res.json({ totalSize: displaySize, totalFiles });

  } catch (error) {
    console.error('[Storage Error] Details:', error.message);
    const status = error.response?.status || 500;
    const isAuthError = status === 401 || status === 403;
    res.status(status).json({
      message: isAuthError ? 'Google token expired or insufficient permissions' : 'Failed to calculate storage',
      error: error.message,
      data: error.response?.data
    });
  }
};

/**
 * @desc    Stream media directly from Google Drive (Proxy)
 * @route   GET /api/gallery/stream/:fileId
 * @access  Public (secured by token in query)
 */
const streamMedia = async (req, res) => {
  const { fileId } = req.params;
  const { token, thumbnail, download } = req.query;

  console.log(`[Stream Request] ID: ${fileId}, Thumbnail: ${thumbnail}, Download: ${download}`);

  if (!token || token === 'null' || token === 'undefined') {
    console.warn(`[Stream Error] Missing or invalid token for file: ${fileId}`);
    return res.status(401).json({ message: 'Valid Google token required for streaming' });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const drive = google.drive({ version: 'v3', auth });

    if (thumbnail === 'true') {
      // Get the thumbnail link from Drive metadata
      const fileData = await drive.files.get({
        fileId: fileId,
        fields: 'thumbnailLink'
      });

      const thumbUrl = fileData.data.thumbnailLink;
      if (!thumbUrl) {
        return res.status(404).json({ message: 'Thumbnail not available' });
      }

      // Fetch the actual thumbnail image bits using the auth client
      const thumbRes = await auth.request({
        url: thumbUrl,
        responseType: 'arraybuffer'
      });

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(Buffer.from(thumbRes.data));
      return;
    }

    // For full media (Photo or Video)
    const mediaDoc = await Media.findOne({ fileId });
    const contentType = mediaDoc ? mediaDoc.fileType : 'application/octet-stream';
    const fileName = mediaDoc ? mediaDoc.fileName : fileId;

    console.log(`[Stream] Starting stream for ${fileId} (${contentType})`);

    const driveResponse = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    if (download === 'true') {
      const safeFileName = encodeURIComponent(fileName);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    driveResponse.data
      .on('error', (err) => {
        console.error(`[Stream Error] ${fileId}:`, err.message);
        if (!res.headersSent) res.status(500).end();
      })
      .pipe(res);

  } catch (error) {
    console.error(`[Streaming Failed] ${fileId}:`, error.message);
    if (!res.headersSent) {
      const status = error.response?.status || 500;
      res.status(status).json({ 
        message: status === 401 ? '401 Unauthorized: Google token expired' : 'Streaming failed', 
        error: error.message 
      });
    }
  }
};

/**
 * @desc    Rename media in Drive and DB
 * @route   PATCH /api/gallery/:id/rename
 * @access  Private
 */
const renameMedia = async (req, res) => {
  const { newName } = req.body;
  const googleAccessToken = req.headers['google-access-token'];

  if (!newName) {
    return res.status(400).json({ message: 'New name is required' });
  }

  console.log(`[Rename] Request started for media ID: ${req.params.id}`);

  try {
    const media = await Media.findOne({ _id: req.params.id, userId: req.user._id });

    if (!media) {
      console.error(`[Rename] Media not found for ID: ${req.params.id}`);
      return res.status(404).json({ message: 'Media not found in database' });
    }

    // 1. Update in Google Drive if token is available
    if (googleAccessToken) {
      console.log(`[Rename] Updating Google Drive file: ${media.fileId}`);
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: googleAccessToken });
      const drive = google.drive({ version: 'v3', auth });

      try {
        await drive.files.update({
          fileId: media.fileId,
          requestBody: { name: newName }
        });
        console.log(`[Rename] Drive file ${media.fileId} successfully renamed to: ${newName}`);
      } catch (driveErr) {
        console.error('[Rename] Google Drive update failed:', driveErr.message);
        // We continue anyway to update the local DB
      }
    } else {
      console.warn('[Rename] No Google Access Token provided. Skipping Drive update.');
    }

    // 2. Update in MongoDB
    console.log(`[Rename] Updating MongoDB record for ${media._id}`);
    media.fileName = newName;
    await media.save();
    console.log(`[Rename] MongoDB record updated successfully.`);

    res.json({ message: 'Media renamed successfully ✏️', media });

  } catch (error) {
    console.error('[Rename] Critical Error:', error);
    res.status(500).json({
      message: 'Rename failed during processing',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  uploadMedia,
  getMediaList,
  getTrashedMedia,
  deleteMedia,
  restoreMedia,
  permanentDeleteMedia,
  getGalleryStorage,
  streamMedia,
  renameMedia
};
