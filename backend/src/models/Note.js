const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  id: {
    type: Number, // Legacy ID from local storage, useful for migration
    required: false
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'bg-surface'
  },
  textColor: {
    type: String,
    default: 'text-on-surface'
  },
  category: {
    type: String,
    default: 'Personal'
  },
  pinned: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  trashed: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['text', 'list', 'drawing'],
    default: 'text'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);
