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
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
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

// In-memory storage for connected users
const connectedUsers = new Map();

// Socket.io Connection Handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', async ({ username, room }) => {
        try {
            // Validate input
            if (!username || !room) {
                socket.emit('error', 'Username and room are required');
                return;
            }

            // Check if username is already taken in the same room
            const existingUser = Array.from(connectedUsers.values()).find(
                user => user.username === username && user.room === room
            );

            if (existingUser) {
                socket.emit('error', 'Username is already taken in this room. Please choose another one.');
                return;
            }

            // Store user information
            connectedUsers.set(socket.id, {
                username,
                room,
                socketId: socket.id
            });

            socket.username = username;
            socket.room = room;

            // Join the room
            socket.join(room);

            // Fetch existing messages for the room
            const messages = await Message.find({ room }).sort({ timestamp: 1 });

            // Send join success and message history
            socket.emit('joinSuccess', { room, username });
            socket.emit('messageHistory', messages);

            // Broadcast user joined message
            const joinMessage = {
                senderId: 'system',
                message: `${username} has joined the chat`,
                timestamp: new Date().toISOString(),
                type: 'system'
            };
            io.to(room).emit('message', joinMessage);

            // Update user list
            const usersInRoom = Array.from(connectedUsers.values())
                .filter(user => user.room === room)
                .map(user => user.username);
            io.to(room).emit('userList', usersInRoom);

        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', 'Failed to join room');
        }
    });

    socket.on('sendMessage', async (messageData) => {
        try {
            const room = socket.room;
            if (!room) {
                socket.emit('error', 'You are not in a room');
                return;
            }

            const newMessage = {
                senderId: socket.username,
                room: room,
                message: messageData.message,
                timestamp: new Date().toISOString(),
                type: messageData.type || 'text',
                filename: messageData.filename
            };

            // Save message to database
            const savedMessage = await Message.create(newMessage);

            // Broadcast message to all users in the room
            io.to(room).emit('message', savedMessage);

        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', 'Failed to send message');
        }
    });

    socket.on('typing', ({ username, room }) => {
        socket.to(room).emit('typing', { username });
    });

    socket.on('stopTyping', ({ username, room }) => {
        socket.to(room).emit('stopTyping', { username });
    });

    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            const { username, room } = user;
            connectedUsers.delete(socket.id);

            if (room) {
                // Broadcast user left message
                const leaveMessage = {
                    senderId: 'system',
                    message: `${username} has left the chat`,
                    timestamp: new Date().toISOString(),
                    type: 'system'
                };
                io.to(room).emit('message', leaveMessage);

                // Update user list
                const usersInRoom = Array.from(connectedUsers.values())
                    .filter(user => user.room === room)
                    .map(user => user.username);
                io.to(room).emit('userList', usersInRoom);
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

// Get messages for a room
app.get('/messages/:room', async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// File upload handling
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
