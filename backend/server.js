import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Message from './models/Message.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Store online users with their IDs and rooms
const onlineUsers = new Map();

// Socket.io Connection Handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining a room
    socket.on('joinRoom', ({ username, room }) => {
        // Validate username and room
        if (username.length < 3) {
            socket.emit('joinError', 'Username must be at least 3 characters long');
            return;
        }

        if (room.length < 3) {
            socket.emit('joinError', 'Room name must be at least 3 characters long');
            return;
        }

        // Check if username is already taken in this room
        const existingUser = Array.from(onlineUsers.values()).find(
            user => user.username === username && user.room === room
        );

        if (existingUser) {
            socket.emit('joinError', 'Username is already taken in this room');
            return;
        }

        // Join the room
        socket.join(room);

        // Store user information
        onlineUsers.set(socket.id, {
            username,
            id: socket.id,
            room
        });

        // Emit updated user list to the room
        io.to(room).emit('userList', Array.from(onlineUsers.values())
            .filter(user => user.room === room)
            .map(user => ({
                username: user.username,
                id: user.id
            })));

        // Emit welcome message
        socket.emit('receiveMessage', {
            senderId: 'system',
            receiverId: room,
            message: `${username} has joined the room`,
            timestamp: new Date()
        });
    });

    // Handle new messages
    socket.on('sendMessage', async (data) => {
        try {
            const message = new Message({
                senderId: data.senderId,
                receiverId: data.receiverId,
                message: data.message
            });
            await message.save();
            
            // Emit to specific receiver if it's a private message
            if (data.receiverId !== data.room) {
                io.to(data.receiverId).emit('receiveMessage', {
                    ...data,
                    timestamp: message.timestamp
                });
            }
            
            // Emit to the room
            io.to(data.room).emit('receiveMessage', {
                ...data,
                timestamp: message.timestamp
            });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
        if (data.receiverId !== data.room) {
            io.to(data.receiverId).emit('userTyping', {
                user: data.user,
                receiverId: data.receiverId
            });
        }
        io.to(data.room).emit('userTyping', {
            user: data.user,
            receiverId: data.room
        });
    });

    // Handle leaving room
    socket.on('leaveRoom', ({ username, room }) => {
        socket.leave(room);
        onlineUsers.delete(socket.id);
        
        // Emit updated user list to the room
        io.to(room).emit('userList', Array.from(onlineUsers.values())
            .filter(user => user.room === room)
            .map(user => ({
                username: user.username,
                id: user.id
            })));

        // Emit leave message
        io.to(room).emit('receiveMessage', {
            senderId: 'system',
            receiverId: room,
            message: `${username} has left the room`,
            timestamp: new Date()
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            const { username, room } = user;
            socket.leave(room);
            onlineUsers.delete(socket.id);
            
            // Emit updated user list to the room
            io.to(room).emit('userList', Array.from(onlineUsers.values())
                .filter(user => user.room === room)
                .map(user => ({
                    username: user.username,
                    id: user.id
                })));

            // Emit disconnect message
            io.to(room).emit('receiveMessage', {
                senderId: 'system',
                receiverId: room,
                message: `${username} has disconnected`,
                timestamp: new Date()
            });
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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
