import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

import userRoute from './routes/userRoute';
import chatRoute from './routes/chatRoutes';
import watchlistRoute from './routes/watchlistRoutes';
import FriendRoute from './routes/friendRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use('/assets', express.static(path.join(process.cwd(), 'src', 'Assets')));
app.use('/api/users', userRoute);
app.use('/api/chat', chatRoute);
app.use('/api/watchlist', watchlistRoute);
app.use('/api/friend', FriendRoute);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a private room for direct messages
  socket.on('join', (userId: number) => {
    socket.join(`user_${userId}`);
  });

  // Handle private messages
  socket.on('private_message', async (data: { 
    senderId: number,
    receiverId: number, 
    message: string 
  }) => {
    const { senderId, receiverId, message } = data;
    
    // Save message using your existing prisma client and DirectMessage model
    // Emit to both sender and receiver rooms
    io.to(`user_${senderId}`).to(`user_${receiverId}`).emit('new_message', {
      senderId,
      receiverId,
      message,
      createdAt: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
