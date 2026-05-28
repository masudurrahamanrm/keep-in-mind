const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  time: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    enum: ['Health', 'Personal', 'Education', 'Work', 'Other'],
    default: 'Other'
  },
  priority: {
    type: String,
    enum: ['Normal', 'High Priority'],
    default: 'Normal'
  },
  repeat: {
    type: String,
    enum: ['Does not repeat', 'Daily', 'Weekly', 'Monthly'],
    default: 'Does not repeat'
  },
  completed: {
    type: Boolean,
    default: false
  },
  snoozedUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reminder', reminderSchema);
