import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Alert, Badge, Modal } from 'react-bootstrap';
import { FaPaperPlane, FaSignOutAlt, FaUsers, FaUser, FaBars, FaTimes, FaSmile, FaImage, FaPaperclip } from 'react-icons/fa';
import NavigationBar from './Navbar';
import './Chat.css';
import { toast } from 'react-toastify';

const socket = io('http://localhost:5000', {
    withCredentials: true,
    transports: ['websocket'],
    autoConnect: true
});

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
    const [showUserList, setShowUserList] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [messageHistory, setMessageHistory] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server');
        });
    
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setError('Failed to connect to server');
        });
    
        return () => {
            socket.off('connect');
            socket.off('connect_error');
        };
    }, []);

    const fetchMessageHistory = async () => {
        try {
            if (!room) {
                console.log('No room specified');
                return;
            }
            
            console.log('Fetching messages for room:', room);
            const response = await axios.get(`http://localhost:5000/messages/${room}`);
            
            // Check if the response contains messages
            if (response.data.messages) {
                setMessages(response.data.messages);
            } else {
                setMessages([]); // Initialize with empty array for new rooms
                console.log('Starting new chat room');
            }
        } catch (error) {
            console.error('Error fetching message history:', error);
            setMessages([]); // Initialize with empty array on error
            if (error.response?.status !== 404) {
                setError('Failed to fetch message history');
            }
        }
    };

    const checkRoomExists = async (roomId) => {
        try {
            const response = await axios.get(`http://localhost:5000/room/${roomId}/exists`);
            return response.data.exists;
        } catch (error) {
            console.error('Error checking room:', error);
            return false;
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (username.length < 3) {
                setError('Username must be at least 3 characters long');
                return;
            }

            if (room.length < 3) {
                setError('Room name must be at least 3 characters long');
                return;
            }

            // Join room first
            socket.emit('joinRoom', { username, room });
            setIsJoined(true);
            
            // Then fetch messages
            await fetchMessageHistory();
        } catch (error) {
            console.error('Error joining room:', error);
            setError('Failed to join room');
            setIsJoined(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            const messageData = {
                senderId: username,
                receiverId: activeChat,
                message: message.trim(),
                timestamp: new Date().toISOString(),
                type: 'text' // Ensure type is set
            };
            socket.emit('sendMessage', messageData);
            setMessage('');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const response = await axios.post('http://localhost:5000/upload', formData);
                const messageData = {
                    senderId: username,
                    receiverId: activeChat,
                    message: response.data.url,
                    timestamp: new Date().toISOString(),
                    type: file.type.startsWith('image/') ? 'image' : 'file'
                };
                socket.emit('sendMessage', messageData);
            } catch (error) {
                console.error('Error uploading file:', error);
            }
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
        setMessageHistory([]);
    };

    const toggleUserList = () => {
        setShowUserList(!showUserList);
    };

    const addEmoji = (emoji) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleLogout = () => {
        handleLeave();
        setUsername('');
        setRoom('');
        setIsJoined(false);
        setMessages([]);
        setOnlineUsers([]);
        setMessageHistory([]);
    };

    useEffect(() => {
        if (isJoined && room) {
            socket.disconnect();
            socket.io.opts.query = { room };
            socket.connect();
            
            socket.on('message', (message) => {
                setMessageHistory(prev => [...prev, message]);
            });

            socket.on('userList', (users) => {
                setOnlineUsers(users || []);
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
                socket.disconnect();
            };
        }
    }, [isJoined, room]);

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setError('Failed to connect to server');
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
        };
    }, []);

    if (!isJoined) {
        return (
            <>
                <NavigationBar 
                    username={username}
                    onlineUsers={onlineUsers}
                    onLogout={handleLogout}
                    isJoined={isJoined}
                />
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
            </>
        );
    }

    return (
        <>
            <NavigationBar 
                username={username}
                onlineUsers={onlineUsers}
                onLogout={handleLogout}
                isJoined={isJoined}
            />
            <Container fluid className="chat-container">
                <Button className="toggle-user-list" onClick={toggleUserList}>
                    {showUserList ? <FaTimes /> : <FaBars />}
                </Button>
                <Row className="h-100">
                    <Col md={3} className={`user-list-container ${!showUserList ? 'collapsed' : ''}`}>
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
                            <h3>
                                <FaUsers /> Room: {room}
                            </h3>
                        </div>
                        <div className="messages-container">
                            <div className="messages-list">
                                {messageHistory.map((msg, index) => (
                                    <div
                                        key={`msg-${index}`}
                                        className={`message ${msg.senderId === username ? 'sent' : 'received'}`}
                                        data-sender={msg.senderId === 'system' ? 'system' : 'user'}
                                    >
                                        <div className="message-content">
                                            {msg.senderId !== 'system' && (
                                                <div className="message-sender">
                                                    {msg.senderId === username ? 'You' : msg.senderId}
                                                </div>
                                            )}
                                            {msg.type === 'image' ? (
                                                <img src={msg.message} alt="Shared" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                                            ) : msg.type === 'file' ? (
                                                <a href={msg.message} target="_blank" rel="noopener noreferrer">
                                                    Download File
                                                </a>
                                            ) : (
                                                <div className="message-text">{msg.message}</div>
                                            )}
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
                            <Button
                                type="button"
                                variant="light"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <FaSmile />
                            </Button>
                            <Form.Control
                                type="text"
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value);
                                    handleTyping();
                                }}
                                placeholder="Type a message..."
                            />
                            <Button
                                type="button"
                                variant="light"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FaPaperclip />
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                accept="image/*,.pdf,.doc,.docx"
                            />
                            <Button type="submit">
                                <FaPaperPlane /> Send
                            </Button>
                        </Form>
                    </Col>
                </Row>

                <Modal show={showEmojiPicker} onHide={() => setShowEmojiPicker(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Select Emoji</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="emoji-grid">
                            {['😊', '😂', '❤️', '👍', '🎉', '🌟', '💡', '✨', '🎨', '🎮', '🎵', '🎬'].map((emoji) => (
                                <Button
                                    key={emoji}
                                    variant="light"
                                    onClick={() => addEmoji(emoji)}
                                    className="emoji-button"
                                >
                                    {emoji}
                                </Button>
                            ))}
                        </div>
                    </Modal.Body>
                </Modal>
            </Container>
        </>
    );
};

export default Chat; 