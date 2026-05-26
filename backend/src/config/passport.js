const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || (process.env.NODE_ENV === 'production' ? 'https://keep-in-mind-1.onrender.com/api/auth/google/callback' : 'http://localhost:5000/api/auth/google/callback')
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists in our db
      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (user) {
        // Update tokens and google ID
        user.googleAccessToken = accessToken;
        if (refreshToken) {
          user.googleRefreshToken = refreshToken;
        }
        
        if (!user.googleId) {
          user.googleId = profile.id;
        }
        if (!user.avatar && profile.photos && profile.photos.length > 0) {
          user.avatar = profile.photos[0].value;
        }
        
        await user.save();
        
        // Trigger background drive initialization if needed
        if (!user.rootFolderId) {
          const { initializeUserDrive } = require('../services/driveService');
          initializeUserDrive(user._id);
        }
        
        return done(null, user);
      } else {
        // If not, create a new user in our db
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '',
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken || null
        });
        await user.save();
        
        // Trigger background drive initialization
        const { initializeUserDrive } = require('../services/driveService');
        initializeUserDrive(user._id);
        
        return done(null, user);
      }
    } catch (err) {
      console.error(err);
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
