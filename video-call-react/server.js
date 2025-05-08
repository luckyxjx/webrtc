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
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST']
  }
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle room joining
  socket.on('join-room', ({ roomId, userId }) => {
    console.log(`User ${userId} (socket: ${socket.id}) joining room ${roomId}`);
    socket.join(roomId);
    
    // Store user info
    socket.userId = userId;
    socket.roomId = roomId;
    
    // Get all users in the room
    const room = io.sockets.adapter.rooms.get(roomId);
    const roomUsers = Array.from(room || [])
      .map(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        return socket?.userId;
      })
      .filter(id => id && id !== userId);
    
    console.log('Users in room:', roomUsers);
    
    // Notify other users in the room
    socket.to(roomId).emit('user-joined', userId);
    
    // Send list of existing users to the new user
    socket.emit('room-users', roomUsers);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.roomId) {
      console.log(`User ${socket.userId} (socket: ${socket.id}) disconnected from room ${socket.roomId}`);
      socket.to(socket.roomId).emit('user-left', socket.userId);
    }
  });
  
  // Signaling for WebRTC
  socket.on('offer', ({ offer, to }) => {
    console.log(`Offer from ${socket.userId} to ${to}`);
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === to);
    
    if (targetSocket) {
      targetSocket.emit('offer', { offer, from: socket.userId });
    } else {
      console.log(`Target user ${to} not found`);
    }
  });
  
  socket.on('answer', ({ answer, to }) => {
    console.log(`Answer from ${socket.userId} to ${to}`);
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === to);
    
    if (targetSocket) {
      targetSocket.emit('answer', { answer, from: socket.userId });
    } else {
      console.log(`Target user ${to} not found`);
    }
  });
  
  socket.on('ice-candidate', ({ candidate, to }) => {
    console.log(`ICE candidate from ${socket.userId} to ${to}`);
    const targetSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.userId === to);
    
    if (targetSocket) {
      targetSocket.emit('ice-candidate', { candidate, from: socket.userId });
    } else {
      console.log(`Target user ${to} not found`);
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