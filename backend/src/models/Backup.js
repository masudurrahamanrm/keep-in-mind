const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driveFileId: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  sizeBytes: {
    type: Number,
    required: true
  },
  noteCount: {
    type: Number,
    required: true
  },
  triggerType: {
    type: String,
    enum: ['manual', 'auto', 'app_close'],
    default: 'auto'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Backup', backupSchema);
