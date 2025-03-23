import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Container, Row, Col, Form, Button, ListGroup, Alert } from 'react-bootstrap';
import UserList from './UserList';
import './Chat.css';

const socket = io('http://localhost:5000');

const Chat = () => {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState('');
    const [room, setRoom] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        socket.on('userList', (users) => {
            setOnlineUsers(users);
        });

        socket.on('receiveMessage', (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on('userTyping', (data) => {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 1000);
        });

        socket.on('joinError', (error) => {
            setError(error);
        });

        return () => {
            socket.off('userList');
            socket.off('receiveMessage');
            socket.off('userTyping');
            socket.off('joinError');
        };
    }, []);

    const handleUsernameSubmit = (e) => {
        e.preventDefault();
        setError('');
        
        if (username.trim().length < 3) {
            setError('Username must be at least 3 characters long');
            return;
        }

        if (room.trim().length < 3) {
            setError('Room name must be at least 3 characters long');
            return;
        }

        socket.emit('joinRoom', { username: username.trim(), room: room.trim() });
        setIsJoined(true);
    };

    const handleMessageSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && username) {
            const messageData = {
                senderId: socket.id,
                receiverId: selectedUser?.id || room,
                message: message.trim(),
                sender: username,
                room: room
            };
            socket.emit('sendMessage', messageData);
            setMessage('');
        }
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        // Fetch message history
        axios.get(`http://localhost:5000/messages/${socket.id}/${user.id}`)
            .then(response => {
                setMessages(response.data);
            })
            .catch(error => {
                console.error('Error fetching messages:', error);
            });
    };

    const handleTyping = () => {
        if (selectedUser) {
            socket.emit('typing', {
                user: username,
                receiverId: selectedUser.id,
                room: room
            });
        }
    };

    const handleLogout = () => {
        socket.emit('leaveRoom', { username, room });
        setUsername('');
        setRoom('');
        setMessages([]);
        setOnlineUsers([]);
        setSelectedUser(null);
        setIsJoined(false);
    };

    if (!isJoined) {
        return (
            <Container className="mt-5">
                <Row className="justify-content-center">
                    <Col md={6}>
                        <div className="welcome-card">
                            <h3 className="text-center mb-4">Welcome to ChatApp</h3>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <Form onSubmit={handleUsernameSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Enter your username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Username (min 3 characters)"
                                        minLength={3}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Enter room name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={room}
                                        onChange={(e) => setRoom(e.target.value)}
                                        placeholder="Room name (min 3 characters)"
                                        minLength={3}
                                        required
                                    />
                                </Form.Group>
                                <Button type="submit" className="w-100">
                                    Join Chat
                                </Button>
                            </Form>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }

    return (
        <Container fluid className="chat-container">
            <Row className="h-100">
                <Col md={3} className="user-list-container">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4>Room: {room}</h4>
                        <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                            Leave
                        </Button>
                    </div>
                    <UserList
                        onlineUsers={onlineUsers}
                        selectedUser={selectedUser}
                        onUserSelect={handleUserSelect}
                    />
                </Col>
                <Col md={9} className="chat-main">
                    <div className="chat-header">
                        <h3>{selectedUser ? `Chat with ${selectedUser.username}` : `Room: ${room}`}</h3>
                    </div>
                    <div className="messages-container">
                        <ListGroup className="messages-list">
                            {messages.map((msg, index) => (
                                <ListGroup.Item
                                    key={index}
                                    className={`message ${msg.senderId === socket.id ? 'sent' : 'received'}`}
                                >
                                    <div className="message-content">
                                        <div className="message-sender">{msg.sender}</div>
                                        <div className="message-text">{msg.message}</div>
                                        <div className="message-time">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                            <div ref={messagesEndRef} />
                        </ListGroup>
                        {isTyping && (
                            <div className="typing-indicator">
                                {selectedUser?.username} is typing...
                            </div>
                        )}
                    </div>
                    <Form onSubmit={handleMessageSubmit} className="message-form">
                        <Form.Group className="d-flex">
                            <Form.Control
                                type="text"
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    handleTyping();
                                }}
                                placeholder="Type a message..."
                            />
                            <Button type="submit" variant="primary" className="ms-2">
                                Send
                            </Button>
                        </Form.Group>
                    </Form>
                </Col>
            </Row>
        </Container>
    );
};

export default Chat; 