import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Message from './models/Message.js';
import multer from 'multer';
import path from 'path';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// In-memory storage for chat rooms and messages
const chatRooms = new Map();

// Socket.io Connection Handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', ({ username, room }) => {
        // Join the room
        socket.join(room);
        socket.username = username;
        socket.currentRoom = room;

        // Initialize room if it doesn't exist
        if (!chatRooms.has(room)) {
            chatRooms.set(room, {
                messages: [],
                users: []
            });
        }

        // Add user to room
        const roomData = chatRooms.get(room);
        roomData.users.push({ id: socket.id, username });

        // Send join message
        const joinMessage = {
            id: Date.now(),
            type: 'system',
            content: `${username} has joined the chat`,
            timestamp: new Date().toISOString()
        };
        roomData.messages.push(joinMessage);

        // Broadcast updates
        io.to(room).emit('message', joinMessage);
        io.to(room).emit('userList', roomData.users);
    });

    socket.on('sendMessage', (message) => {
        const room = socket.currentRoom;
        if (!room || !chatRooms.has(room)) return;
    
        const newMessage = {
            id: Date.now(),
            senderId: socket.username, // Change this to senderId
            message: message.message, // Use message.message
            timestamp: new Date().toISOString(),
            type: message.type || 'text' // Add type if needed
        };
    
        chatRooms.get(room).messages.push(newMessage);
        io.to(room).emit('message', newMessage);
    });

    socket.on('disconnect', () => {
        const room = socket.currentRoom;
        if (room && chatRooms.has(room)) {
            const roomData = chatRooms.get(room);
            
            // Remove user from room
            roomData.users = roomData.users.filter(user => user.id !== socket.id);

            if (socket.username) {
                const leaveMessage = {
                    id: Date.now(),
                    type: 'system',
                    content: `${socket.username} has left the chat`,
                    timestamp: new Date().toISOString()
                };
                roomData.messages.push(leaveMessage);
                io.to(room).emit('message', leaveMessage);
                io.to(room).emit('userList', roomData.users);
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

// REST API Routes
app.post('/messages', async (req, res) => {
    try {
        const message = new Message(req.body);
        await message.save();
        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get messages between two users
app.get('/messages/:senderId/:receiverId', async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { senderId: req.params.senderId, receiverId: req.params.receiverId },
                { senderId: req.params.receiverId, receiverId: req.params.senderId }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all messages for a room
app.get('/messages/room/:roomId', async (req, res) => {
    try {
        const messages = await Message.find({
            receiverId: req.params.roomId
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to get all messages for a room
app.get('/messages/:room', (req, res) => {
    const { room } = req.params;
    const roomData = chatRooms.get(room);
    
    if (!roomData) {
        return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json({ messages: roomData.messages, exists: roomData.messages.length > 0 });
});

// Add this route to check if room exists
app.get('/room/:roomId/exists', (req, res) => {
    const { roomId } = req.params;
    const exists = chatRooms.has(roomId) && chatRooms.get(roomId).length > 0;
    res.json({ exists });
});

// Add this after your routes
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Test route to verify server is running
app.get('/test', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Add at the top of your server.js
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS enabled for origin: *`);
});
