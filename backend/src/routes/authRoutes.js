const express = require('express');
const passport = require('passport');
const { googleCallback, getMe, logout, ping } = require('../controllers/authController');
const { setup2FA, verify2FA, disable2FA, get2FAStatus, loginVerify2FA } = require('../controllers/twoFactorController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
  accessType: 'offline',
  prompt: 'consent'
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/auth' }), 
  googleCallback
);

// Session routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Utilities
router.post('/ping', protect, ping);

// Two-Factor Authentication routes
router.get('/2fa/status',protect,get2FAStatus);
router.post('/2fa/setup',protect,setup2FA);
router.post('/2fa/verify',protect,verify2FA);
router.post('/2fa/disable',protect,disable2FA);
// Public: completes 2FA login using a pending token (not a full JWT)
router.post('/2fa/login-verify',loginVerify2FA);

module.exports = router;
