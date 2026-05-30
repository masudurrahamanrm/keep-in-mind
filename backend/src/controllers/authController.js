const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const logActivity = require('../utils/logger');
const bcrypt = require('bcryptjs');

// @desc    Callback for Google OAuth
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = async (req, res) => {
  try {
    const user = req.user; // user from passport

    await logActivity({
      title: "User Login",
      actor: user.email,
      type: "success",
      details: "Session started via Google OAuth"
    });

    const token = generateToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Since frontend and backend might be on different ports in dev, lax is safer
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const userPayload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    };
    const gToken = user.googleAccessToken || '';
    res.redirect(`${frontendUrl}/?token=${token}&user=${encodeURIComponent(JSON.stringify(userPayload))}&googleToken=${encodeURIComponent(gToken)}`);
  } catch (error) {
    console.error('Google Callback Error:', error.message);
    res.status(500).send('Authentication failed');
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        authProvider: req.user.authProvider,
        googleId: req.user.googleId
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};

// @desc    Register a new user (local)
// @route   POST /api/auth/register
// @access  Public
const registerLocal = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: 'local',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FFC107&color=fff`
    });

    if (user) {
      const token = generateToken(user._id);
      res.status(201).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          authProvider: user.authProvider
        },
        token
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user (local)
// @route   POST /api/auth/login
// @access  Public
const loginLocal = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(user._id);
      
      await logActivity({
        title: "User Login",
        actor: user.email,
        type: "success",
        details: "Session started via Local Auth"
      });

      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          authProvider: user.authProvider
        },
        token
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user "last seen" timestamp
// @route   POST /api/auth/ping
// @access  Private
const ping = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { lastActive: new Date() }, 
      { new: true }
    );
    
    if (user) {
      res.json({ message: 'Ping successful', lastActive: user.lastActive });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { googleCallback, getMe, logout, ping, registerLocal, loginLocal };
