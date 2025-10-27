const { Server } = require('socket.io');

function setupWebSocket(server, pool) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // When a duty is picked, broadcast to all clients
    socket.on('duty-picked', async (data) => {
      console.log('Duty picked:', data);
      
      // Broadcast to all other clients
      socket.broadcast.emit('calendar-updated', {
        action: 'pick',
        sessionId: data.sessionId,
        timestamp: new Date().toISOString()
      });
    });

    // When a duty is released, broadcast to all clients
    socket.on('duty-released', async (data) => {
      console.log('Duty released:', data);
      
      // Broadcast to all other clients
      socket.broadcast.emit('calendar-updated', {
        action: 'release',
        sessionId: data.sessionId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = setupWebSocket;
