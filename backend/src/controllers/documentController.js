const { uploadFileToDrive, getDriveClient, renameFileInDrive, deleteFileFromDrive } = require('../services/driveService');
const Document = require('../models/Document');
const User = require('../models/User');

/**
 * @desc    Upload file directly to Google Drive
 * @route   POST /api/documents/upload
 * @access  Private
 */
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { category, title, isEncrypted } = req.body;
    const userId = req.user._id;

    // Default category if not provided or invalid
    const validCategories = [
      'Government IDs', 'Education', 'Medical', 'Banking', 
      'Property', 'Others', 'Notes', 'Backups', 'Encrypted', 'KeepInMind'
    ];
    
    let finalCategory = category;
    if (isEncrypted === 'true' || isEncrypted === true) {
      finalCategory = 'Encrypted';
    } else if (!validCategories.includes(category)) {
      finalCategory = 'Others';
    }

    // 1. Upload to Google Drive
    const driveFile = await uploadFileToDrive(
      userId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      finalCategory
    );

    // 2. Save metadata to MongoDB Document model
    const doc = new Document({
      user: userId,
      title: title || req.file.originalname,
      driveFileId: driveFile.id,
      category: finalCategory,
      mimeType: req.file.mimetype,
      size: req.file.size,
      thumbnailUrl: driveFile.thumbnailLink || null,
      isEncrypted: isEncrypted === 'true' || isEncrypted === true
    });

    await doc.save();

    res.status(201).json({
      message: 'File uploaded successfully',
      document: doc,
      driveData: driveFile // Contains webViewLink and iconLink if needed
    });
  } catch (error) {
    console.error('Upload Controller Error:', error.message);
    res.status(500).json({ message: error.message || 'File upload failed' });
  }
};

/**
 * @desc    Get all documents for a specific category
 * @route   GET /api/documents/:category
 * @access  Private
 */
const getDocumentsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Convert url param like "government-ids" to "Government IDs"
    const decodedCategory = category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace('Ids', 'IDs');

    const documents = await Document.find({ 
      user: req.user._id,
      category: decodedCategory
    }).sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Get Documents Error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

/**
 * @desc    Get document counts grouped by category
 * @route   GET /api/documents/metrics/counts
 * @access  Private
 */
const getDocumentCounts = async (req, res) => {
  try {
    const counts = await Document.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const countsMap = counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json(countsMap);
  } catch (error) {
    console.error('Get Document Counts Error:', error);
    res.status(500).json({ message: 'Failed to fetch document counts' });
  }
};

/**
 * @desc    Delete a document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // 1. Delete from Google Drive
    const user = await User.findById(req.user._id);
    await deleteFileFromDrive(user, doc.driveFileId);

    // 2. Delete from MongoDB
    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete Document Error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

/**
 * @desc    Rename a document
 * @route   PATCH /api/documents/:id/rename
 * @access  Private
 */
const renameDocument = async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) {
      return res.status(400).json({ message: 'New name is required' });
    }

    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // 1. Rename in Google Drive
    const user = await User.findById(req.user._id);
    await renameFileInDrive(user, doc.driveFileId, newName);

    // 2. Rename in MongoDB
    doc.title = newName;
    await doc.save();

    res.json({ message: 'Document renamed successfully', document: doc });
  } catch (error) {
    console.error('Rename Document Error:', error);
    res.status(500).json({ message: 'Failed to rename document' });
  }
};

/**
 * @desc    Stream document directly from Google Drive
 * @route   GET /api/documents/stream/:fileId
 * @access  Private (uses token in query or headers)
 */
const streamDocument = async (req, res) => {
  const { fileId } = req.params;
  const { download } = req.query;

  try {
    const doc = await Document.findOne({ driveFileId: fileId });
    const user = await User.findById(doc ? doc.user : req.user._id);
    
    if (!user || !user.googleAccessToken) {
      return res.status(401).json({ message: 'Unauthorized or missing Google tokens' });
    }

    const drive = getDriveClient(user);

    const contentType = doc ? doc.mimeType : 'application/octet-stream';
    const fileName = doc ? doc.title : fileId;

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
      res.status(status).json({ message: 'Streaming failed', error: error.message });
    }
  }
};

module.exports = {
  uploadDocument,
  getDocumentsByCategory,
  deleteDocument,
  renameDocument,
  streamDocument,
  getDocumentCounts
};
