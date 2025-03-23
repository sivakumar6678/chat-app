import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Alert, Badge } from 'react-bootstrap';
import { FaPaperPlane, FaSignOutAlt, FaUsers, FaUser } from 'react-icons/fa';
import './Chat.css';

const socket = io('http://localhost:5000');

const Chat = () => {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [activeChat, setActiveChat] = useState(null);
    const [error, setError] = useState('');
    const [room, setRoom] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleJoin = (e) => {
        e.preventDefault();
        setError('');

        if (username.length < 3) {
            setError('Username must be at least 3 characters long');
            return;
        }

        if (room.length < 3) {
            setError('Room name must be at least 3 characters long');
            return;
        }

        socket.emit('joinRoom', { username, room });
        setIsJoined(true);
        setActiveChat(room);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('sendMessage', {
                senderId: username,
                receiverId: activeChat,
                message: message.trim(),
                timestamp: new Date().toISOString()
            });
            setMessage('');
        }
    };

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing', { username, room });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('stopTyping', { username, room });
        }, 1000);
    };

    const handleLeave = () => {
        socket.emit('leaveRoom', { username, room });
        setIsJoined(false);
        setActiveChat(null);
        setMessages([]);
        setOnlineUsers([]);
    };

    useEffect(() => {
        socket.on('message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('userList', (users) => {
            setOnlineUsers(users);
        });

        socket.on('typing', ({ username }) => {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 1000);
        });

        socket.on('error', (error) => {
            setError(error);
        });

        return () => {
            socket.off('message');
            socket.off('userList');
            socket.off('typing');
            socket.off('error');
        };
    }, []);

    if (!isJoined) {
        return (
            <Container>
                <div className="welcome-card">
                    <h3>Welcome to Chat App</h3>
                    <Form onSubmit={handleJoin}>
                        <Form.Group className="mb-3">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Room</Form.Label>
                            <Form.Control
                                type="text"
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                                placeholder="Enter room name"
                                required
                            />
                        </Form.Group>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Button type="submit" className="w-100">
                            Join Chat
                        </Button>
                    </Form>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="chat-container">
            <Row className="h-100">
                <Col md={3} className="user-list-container">
                    <div className="user-list-header">
                        <h4>Online Users</h4>
                        <Badge bg="primary">{onlineUsers.length}</Badge>
                    </div>
                    <div className="user-list">
                        {onlineUsers.map((user) => (
                            <div
                                key={user.id}
                                className={`user-list-item ${user.username === username ? 'active' : ''}`}
                            >
                                <div className="user-icon">
                                    <FaUser />
                                </div>
                                <div className="user-info">
                                    <div className="user-name">{user.username}</div>
                                    <div className="user-status">Online</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Col>
                <Col md={9} className="chat-main">
                    <div className="chat-header">
                        <h3>Room: {room}</h3>
                        <Button variant="outline-danger" onClick={handleLeave}>
                            <FaSignOutAlt /> Leave
                        </Button>
                    </div>
                    <div className="messages-container">
                        <div className="messages-list">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`message ${msg.senderId === username ? 'sent' : 'received'}`}
                                    data-sender={msg.senderId === 'system' ? 'system' : 'user'}
                                >
                                    <div className="message-content">
                                        {msg.senderId !== 'system' && (
                                            <div className="message-sender">
                                                {msg.senderId === username ? 'You' : msg.senderId}
                                            </div>
                                        )}
                                        <div className="message-text">{msg.message}</div>
                                        {msg.senderId !== 'system' && (
                                            <div className="message-time">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="typing-indicator">
                                    Someone is typing...
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                    <Form className="message-form" onSubmit={handleSubmit}>
                        <Form.Control
                            type="text"
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                handleTyping();
                            }}
                            placeholder="Type a message..."
                        />
                        <Button type="submit">
                            <FaPaperPlane /> Send
                        </Button>
                    </Form>
                </Col>
            </Row>
        </Container>
    );
};

export default Chat; 