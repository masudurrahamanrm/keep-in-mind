const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  driveFileId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Government IDs', 'Education', 'Medical', 'Banking', 'Property', 'Others', 'Notes', 'Backups', 'Encrypted', 'KeepInMind'],
    default: 'Others'
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  isEncrypted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
