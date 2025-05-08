const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();

// Create HTTP server
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const rooms = new Map(); // roomId -> { admin: string, users: Set<string> }

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle room joining
  socket.on('join-room', ({ roomId, userId }) => {
    console.log(`User ${userId} joining room ${roomId}`);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { admin: userId, users: new Set() });
    }
    
    const room = rooms.get(roomId);
    room.users.add(userId);
    
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', userId);
    
    // Send current room users to the new participant
    io.to(roomId).emit('room-users', Array.from(room.users));
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find and leave all rooms the user was in
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        
        // If admin disconnects, assign new admin or delete room
        if (room.admin === socket.id) {
          const remainingUsers = Array.from(room.users);
          if (remainingUsers.length > 0) {
            room.admin = remainingUsers[0];
            io.to(remainingUsers[0]).emit('admin-assigned');
          } else {
            rooms.delete(roomId);
          }
        }
        
        socket.to(roomId).emit('user-left', socket.id);
        io.to(roomId).emit('room-users', Array.from(room.users));
      }
    });
  });
  
  // Signaling for WebRTC
  socket.on('offer', ({ offer, to }) => {
    socket.to(to).emit('offer', { offer, from: socket.id });
  });
  
  socket.on('answer', ({ answer, to }) => {
    socket.to(to).emit('answer', { answer, from: socket.id });
  });
  
  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('leave-room', (roomId) => {
    console.log(`User leaving room ${roomId}`);
    const room = rooms.get(roomId);
    if (room) {
      room.users.delete(socket.id);
      
      // If admin leaves, assign new admin or delete room
      if (room.admin === socket.id) {
        const remainingUsers = Array.from(room.users);
        if (remainingUsers.length > 0) {
          room.admin = remainingUsers[0];
          io.to(remainingUsers[0]).emit('admin-assigned');
        } else {
          rooms.delete(roomId);
        }
      }
      
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', socket.id);
      io.to(roomId).emit('room-users', Array.from(room.users));
    }
  });

  socket.on('admin-command', ({ command, targetId, roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.admin === socket.id) {
      // Verify the target user is in the room
      if (room.users.has(targetId)) {
        io.to(targetId).emit('admin-command', { command, targetId });
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3002;
const HOST = '0.0.0.0';  // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  const networkInterfaces = os.networkInterfaces();
  console.log(`HTTP Server running on port ${PORT}`);
  
  // Log all available IP addresses
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`Access the app at http://${interface.address}:${PORT}`);
      }
    });
  });
}); 