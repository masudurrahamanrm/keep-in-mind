const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String
  },
  verificationCodeExpiresAt: {
    type: Date
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  galleryFolderId: {
    type: String,
    default: null
  },
  googleAccessToken: {
    type: String,
    default: null
  },
  googleRefreshToken: {
    type: String,
    default: null
  },
  rootFolderId: {
    type: String,
    default: null
  },
  governmentFolderId: {
    type: String,
    default: null
  },
  educationFolderId: {
    type: String,
    default: null
  },
  medicalFolderId: {
    type: String,
    default: null
  },
  bankingFolderId: {
    type: String,
    default: null
  },
  propertyFolderId: {
    type: String,
    default: null
  },
  othersFolderId: {
    type: String,
    default: null
  },
  encryptedFolderId: {
    type: String,
    default: null
  },
  backupsFolderId: {
    type: String,
    default: null
  },
  notesFolderId: {
    type: String,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
