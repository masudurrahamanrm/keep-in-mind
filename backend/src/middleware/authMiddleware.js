const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = req.cookies?.token || req.query?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      console.log(`[Auth Middleware] Token verified for ID: ${decoded.id}`);

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        console.warn(`[Auth Middleware] User not found for ID: ${decoded.id}`);
        return res.status(401).json({ message: 'User not found, not authorized' });
      }
      console.log(`[Auth Middleware] User authorized: ${req.user.email}`);
      next();
    } catch (error) {
      console.error('[Auth Middleware Error]', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
