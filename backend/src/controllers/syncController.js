const Note = require('../models/Note');
const Backup = require('../models/Backup');
const { encrypt, decrypt } = require('../utils/cryptoUtils');
const driveService = require('../services/driveService');
const { Readable } = require('stream');

// @desc    Push local changes to server (conflict resolution)
// @route   POST /api/sync/push
// @access  Private
const pushSync = async (req, res) => {
  const { notes } = req.body; // Array of modified notes from client
  const userId = req.user._id;

  if (!notes || !Array.isArray(notes)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  const syncResults = {
    updated: [],
    conflicts: [],
    errors: []
  };

  for (const clientNote of notes) {
    try {
      // If no MongoDB _id exists yet, it's a new note
      if (!clientNote._id || clientNote._id.startsWith('local_')) {
        const newNoteData = {
          ...clientNote,
          user: userId,
          version: 1,
          syncStatus: 'synced'
        };
        delete newNoteData._id; // Let Mongo generate ID
        const newNote = await Note.create(newNoteData);
        syncResults.updated.push({ clientId: clientNote._id, serverNote: newNote });
        continue;
      }

      const serverNote = await Note.findOne({ _id: clientNote._id, user: userId });
      if (!serverNote) {
        syncResults.errors.push({ id: clientNote._id, message: 'Note not found' });
        continue;
      }

      // Conflict Resolution
      if (clientNote.version === serverNote.version) {
        // Safe to update
        const updateData = {
          ...clientNote,
          version: serverNote.version + 1,
          syncStatus: 'synced',
          updatedAt: new Date()
        };
        delete updateData._id;
        delete updateData.user;
        
        const updated = await Note.findByIdAndUpdate(clientNote._id, updateData, { new: true });
        syncResults.updated.push({ clientId: clientNote._id, serverNote: updated });
      } else if (clientNote.version < serverNote.version) {
        // Conflict: Server has newer changes
        // For now, server wins. Client needs to resolve or accept server version.
        syncResults.conflicts.push({ clientId: clientNote._id, serverNote });
      } else {
        // Force update (client version somehow ahead)
        const updateData = {
          ...clientNote,
          syncStatus: 'synced',
          updatedAt: new Date()
        };
        delete updateData._id;
        delete updateData.user;
        const updated = await Note.findByIdAndUpdate(clientNote._id, updateData, { new: true });
        syncResults.updated.push({ clientId: clientNote._id, serverNote: updated });
      }
    } catch (err) {
      syncResults.errors.push({ id: clientNote._id, message: err.message });
    }
  }

  res.json(syncResults);
};

// @desc    Pull remote changes from server
// @route   GET /api/sync/pull
// @access  Private
const pullSync = async (req, res) => {
  const { since } = req.query; // Timestamp string
  const userId = req.user._id;

  try {
    const query = { user: userId };
    if (since) {
      query.updatedAt = { $gt: new Date(since) };
    }

    const notes = await Note.find(query);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Trigger Google Drive Backup
// @route   POST /api/sync/backup
// @access  Private
const backupToDrive = async (req, res) => {
  const userId = req.user._id;
  
  try {
    const notes = await Note.find({ user: userId });
    
    // Encrypt notes
    const jsonPayload = JSON.stringify(notes);
    const encryptedData = encrypt(jsonPayload);
    const buffer = Buffer.from(encryptedData, 'utf-8');

    const fileName = `keepinmind_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.enc.json`;

    // Upload to Google Drive
    const driveResult = await driveService.uploadFileToDrive(
      userId,
      buffer,
      fileName,
      'application/json',
      'Backups'
    );

    // Save backup record
    const backupRecord = await Backup.create({
      user: userId,
      driveFileId: driveResult.id,
      fileName: fileName,
      sizeBytes: buffer.length,
      noteCount: notes.length,
      triggerType: req.body.triggerType || 'manual'
    });

    res.json(backupRecord);
  } catch (err) {
    console.error('Backup failed:', err);
    res.status(500).json({ message: 'Backup failed', error: err.message });
  }
};

// @desc    List available backups from Drive/DB
// @route   GET /api/sync/backups
// @access  Private
const listBackups = async (req, res) => {
  try {
    const backups = await Backup.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(backups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Restore notes from Google Drive backup
// @route   POST /api/sync/restore/:fileId
// @access  Private
const restoreFromBackup = async (req, res) => {
  const { fileId } = req.params;
  const user = req.user;

  try {
    const drive = driveService.getDriveClient(user);
    
    // Download file
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    let chunks = [];
    response.data.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      response.data.on('end', resolve);
      response.data.on('error', reject);
    });

    const encryptedData = Buffer.concat(chunks).toString('utf-8');
    const decryptedJson = decrypt(encryptedData);
    const notes = JSON.parse(decryptedJson);

    // Wipe current notes & restore
    await Note.deleteMany({ user: user._id });
    
    const restoredNotes = notes.map(n => {
      delete n._id; // Ensure clean insert
      return { ...n, user: user._id, syncStatus: 'synced' };
    });

    await Note.insertMany(restoredNotes);

    res.json({ message: 'Restore completed successfully', count: restoredNotes.length });
  } catch (err) {
    console.error('Restore failed:', err);
    res.status(500).json({ message: 'Restore failed', error: err.message });
  }
};

module.exports = {
  pushSync,
  pullSync,
  backupToDrive,
  listBackups,
  restoreFromBackup
};
