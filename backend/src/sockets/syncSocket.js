const jwt = require('jsonwebtoken');

const initSyncSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SyncSocket] User connected: ${socket.userId} (Socket ID: ${socket.id})`);

    // Join a private room for this user
    socket.join(socket.userId);

    // Handle client broadcasting a note update
    socket.on('note_updated', (data) => {
      // Broadcast to all other devices in the same user's room
      socket.to(socket.userId).emit('note_updated', data);
    });

    // Handle client broadcasting a note deletion
    socket.on('note_deleted', (data) => {
      socket.to(socket.userId).emit('note_deleted', data);
    });

    // Handle manual sync trigger from another device
    socket.on('trigger_sync', () => {
      socket.to(socket.userId).emit('trigger_sync');
    });

    socket.on('disconnect', () => {
      console.log(`[SyncSocket] User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = initSyncSocket;
