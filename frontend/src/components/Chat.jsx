import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const [room, setRoom] = useState('');
    const [message, setMessage] = useState('');
    const [messageHistory, setMessageHistory] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [isJoined, setIsJoined] = useState(false);
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [showUserList, setShowUserList] = useState(true);
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimersRef = useRef({});
    const [lastCheckTime, setLastCheckTime] = useState(Date.now());

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const clearTypingStatus = useCallback((typingUsername) => {
        setTypingUsers(prev => prev.filter(u => u !== typingUsername));
        if (typingTimersRef.current[typingUsername]) {
            clearTimeout(typingTimersRef.current[typingUsername]);
            delete typingTimersRef.current[typingUsername];
        }
    }, []);

    const fetchLatestData = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/messages/${room}`);
            if (response.ok) {
                const data = await response.json();
                setMessageHistory(prev => {
                    if (data.length > prev.length) {
                        return data;
                    }
                    return prev;
                });
            }

            const usersResponse = await fetch(`http://localhost:5000/api/users/${room}`);
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                setOnlineUsers(usersData);
            }

            setLastCheckTime(Date.now());
        } catch (error) {
            console.error('Error fetching latest data:', error);
        }
    }, [room]);

    useEffect(() => {
        const checkInterval = setInterval(() => {
            fetchLatestData();
        }, 60000);

        return () => clearInterval(checkInterval);
    }, [fetchLatestData]);

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server');
            setIsConnected(true);
            setError('');
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            setIsConnected(false);
            setIsJoined(false);
            setOnlineUsers([]);
            setMessageHistory([]);
            setTypingUsers([]);
            setError('Disconnected from server. Please refresh or try joining again.');
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setError(`Failed to connect: ${error.message}. Server might be down.`);
            setIsConnected(false);
        });

        socket.on('joinSuccess', ({ room: joinedRoom, username: joinedUsername }) => {
            console.log(`Successfully joined room "${joinedRoom}" as "${joinedUsername}"`);
            setIsJoined(true);
            setError('');
        });

        socket.on('error', (errMsg) => {
            console.error('Socket error received:', errMsg);
            toast.error(`Error: ${errMsg}`);
            if (errMsg.includes('Username is already taken')) {
                setIsJoined(false);
                setUsername('');
                setError(errMsg);
            } else if (errMsg.includes('required')) {
                setError(errMsg);
            }
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('joinSuccess');
            socket.off('error');
            Object.values(typingTimersRef.current).forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        if (isJoined && room && isConnected) {
            console.log('Setting up chat listeners for room:', room);
            const handleMessage = (newMessage) => {
                console.log('Received message:', newMessage);
                setMessageHistory(prev => {
                    if (newMessage.type === 'system' && prev.length > 0 && prev[prev.length - 1].message === newMessage.message) {
                        return prev;
                    }
                    const messageWithKey = { ...newMessage, _id: newMessage._id || `temp-${Date.now()}-${Math.random()}` };
                    console.log('Updating message history state:', [...prev, messageWithKey]);
                    return [...prev, messageWithKey];
                });
                if (newMessage.senderId !== 'system') {
                    clearTypingStatus(newMessage.senderId);
                }
                scrollToBottom();
            };
            socket.on('message', handleMessage);

            const handleMessageHistory = (messages) => {
                console.log('Received message history:', messages);
                setMessageHistory(messages.map(msg => ({ ...msg, _id: msg._id || `hist-${msg.timestamp}-${Math.random()}` })));
                scrollToBottom();
            };
            socket.on('messageHistory', handleMessageHistory);

            const handleUserList = (users) => {
                console.log('Received user list:', users);
                setOnlineUsers(users || []);
            };
            socket.on('userList', handleUserList);

            const handleTyping = ({ username: typingUsername }) => {
                if (typingUsername !== username) {
                    setTypingUsers(prev => [...new Set([...prev, typingUsername])]);

                    if (typingTimersRef.current[typingUsername]) {
                        clearTimeout(typingTimersRef.current[typingUsername]);
                    }

                    typingTimersRef.current[typingUsername] = setTimeout(() => {
                        console.log(`Typing timeout for ${typingUsername}`);
                        clearTypingStatus(typingUsername);
                    }, 3000);
                }
            };
            socket.on('typing', handleTyping);

            const handleStopTyping = ({ username: typingUsername }) => {
                clearTypingStatus(typingUsername);
            };
            socket.on('stopTyping', handleStopTyping);

            return () => {
                console.log('Cleaning up chat listeners for room:', room);
                socket.off('message', handleMessage);
                socket.off('messageHistory', handleMessageHistory);
                socket.off('userList', handleUserList);
                socket.off('typing', handleTyping);
                socket.off('stopTyping', handleStopTyping);
                Object.values(typingTimersRef.current).forEach(clearTimeout);
                typingTimersRef.current = {};
            };
        } else {
            console.log('Skipping chat listener setup (not joined, no room, or not connected). isJoined:', isJoined, 'room:', room, 'isConnected:', isConnected);
        }
    }, [isJoined, room, isConnected, scrollToBottom, clearTypingStatus, username]);

    useEffect(() => {
        if (isJoined) {
            scrollToBottom();
        }
    }, [messageHistory, isJoined, scrollToBottom]);

    const handleJoin = (e) => {
        e.preventDefault();
        setError('');

        if (!username || !room) {
            setError('Please enter both username and room name');
            return;
        }
        if (username.length < 3 || room.length < 3) {
            setError('Username and room must be at least 3 characters long.');
            return;
        }

        if (!isConnected) {
            setError('Not connected to server. Please wait or refresh the page.');
            return;
        }

        console.log(`Attempting to join room "${room}" as "${username}"`);
        socket.emit('joinRoom', { username, room });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && isJoined && isConnected) {
            const messageData = {
                message: message.trim(),
                type: 'text'
            };
            console.log('Sending message:', messageData);
            socket.emit('sendMessage', messageData);
            setMessage('');
            socket.emit('stopTyping', { username, room });
            handleTyping.isTypingSent = false;
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        } else if (!isConnected) {
            toast.error("Cannot send message: Not connected to server.");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!isJoined) {
            toast.error("You must join a room to upload files.");
            return;
        }
        if (!isConnected) {
            toast.error("Cannot upload file: Not connected to server.");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            toast.info("Uploading file...");
            const response = await axios.post('http://localhost:5000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data && response.data.url) {
                const messageData = {
                    message: response.data.url,
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    filename: file.name
                };
                console.log('Sending file message:', messageData);
                socket.emit('sendMessage', messageData);
                toast.success("File uploaded and sent successfully!");
            } else {
                throw new Error("Invalid response from file upload server.");
            }

        } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            const errorMsg = uploadError.response?.data?.error || uploadError.message || 'Unknown upload error';
            toast.error(`Failed to upload file: ${errorMsg}`);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleTyping = useCallback(() => {
        if (!handleTyping.isTypingSent && isJoined && isConnected) {
            handleTyping.isTypingSent = true;
            socket.emit('typing', { username, room });
            console.log('Emitted typing');

            setTimeout(() => {
                handleTyping.isTypingSent = false;
            }, 1000);
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (isJoined && isConnected) {
                socket.emit('stopTyping', { username, room });
                console.log('Emitted stopTyping (timeout)');
                typingTimeoutRef.current = null;
                handleTyping.isTypingSent = false;
            }
        }, 1500);

    }, [isJoined, isConnected, username, room]);
    handleTyping.isTypingSent = false;

    const toggleUserList = () => {
        setShowUserList(!showUserList);
    };

    const handleLogout = () => {
        console.log('Logging out, disconnecting socket...');
        socket.disconnect();
        setUsername('');
        setRoom('');
        setIsJoined(false);
        setMessageHistory([]);
        setOnlineUsers([]);
        setError('');
        setTypingUsers([]);
        setIsConnected(false);
    };

    if (!isJoined) {
        return (
            <>
                <NavigationBar
                    username={username}
                    onlineUsers={[]}
                    onLogout={handleLogout}
                    isJoined={false}
                />
                <Container className="welcome-container">
                    <div className="welcome-card">
                        <h2>Welcome to Chat App</h2>
                        <p>Enter a username and room name to start chatting.</p>
                        {!isConnected && <Alert variant="warning">Connecting to server...</Alert>}
                        {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
                        <Form onSubmit={handleJoin}>
                            <Form.Group className="mb-3">
                                <Form.Label>Username</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.trim())}
                                    placeholder="Your username"
                                    required
                                    minLength={3}
                                    aria-describedby="usernameHelp"
                                />
                                <Form.Text id="usernameHelp" muted>
                                    Min 3 characters.
                                </Form.Text>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Room</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={room}
                                    onChange={(e) => setRoom(e.target.value.trim())}
                                    placeholder="Room name"
                                    required
                                    minLength={3}
                                    aria-describedby="roomHelp"
                                />
                                <Form.Text id="roomHelp" muted>
                                    Min 3 characters.
                                </Form.Text>
                            </Form.Group>
                            <Button
                                type="submit"
                                className="join-button w-100"
                                disabled={!username || !room || username.length < 3 || room.length < 3 || !isConnected}
                            >
                                {isConnected ? 'Join Chat' : 'Connecting...'}
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
                <Button className={`toggle-user-list d-md-none ${showUserList ? 'active' : ''}`} onClick={toggleUserList} aria-label="Toggle user list">
                    {showUserList ? <FaTimes /> : <FaBars />}
                </Button>
                <Row className="h-100 flex-nowrap">
                    <Col
                        md={3}
                        className={`user-list-container ps-md-0 ${showUserList ? '' : 'collapsed'}`}
                        style={{ display: showUserList || window.innerWidth >= 768 ? 'flex' : 'none' }}
                    >
                        <div className="user-list-header">
                            <h4>Online</h4>
                            <Badge bg="success" pill>
                                {onlineUsers.length}
                            </Badge>
                        </div>
                        <div className="user-list custom-scrollbar">
                            {Array.isArray(onlineUsers) && onlineUsers.map((user) => (
                                <div
                                    key={user}
                                    className={`user-list-item ${user === username ? 'active' : ''}`}
                                >
                                    <div className="user-icon">
                                        <span className="user-initial">
                                            {user ? user[0].toUpperCase() : '?'}
                                        </span>
                                    </div>
                                    <div className="user-info">
                                        <div className="user-name">{user || 'Unknown'}</div>
                                    </div>
                                </div>
                            ))}
                            {onlineUsers.length === 0 && <div className="text-muted p-2">Connecting users...</div>}
                        </div>
                    </Col>
                    <Col className={`chat-main ${showUserList ? '' : 'full-width'}`}>
                        <div className="chat-header">
                            <h3>
                                <FaUsers className="me-2"/> Room: <strong>{room}</strong>
                            </h3>
                        </div>
                        <div className="messages-container custom-scrollbar">
                            <div className="messages-list">
                                {messageHistory.map((msg, index) => (
                                    <div
                                        key={msg._id || `msg-${index}`}
                                        className={`message-wrapper ${msg.senderId === username ? 'sent' : msg.senderId === 'system' ? 'system' : 'received'}`}
                                    >
                                        <div className='message-content'>
                                            {msg.senderId !== username && msg.senderId !== 'system' && (
                                                <div className="message-sender">
                                                    {msg.senderId}
                                                </div>
                                            )}
                                            <div className='message-body'>
                                                {msg.type === 'image' ? (
                                                    <img
                                                        src={msg.message}
                                                        alt={msg.filename || 'Shared image'}
                                                        className="message-image"
                                                        onClick={() => window.open(msg.message, '_blank')}
                                                        loading="lazy"
                                                    />
                                                ) : msg.type === 'file' ? (
                                                    <a
                                                        href={msg.message}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="file-link d-flex align-items-center p-2"
                                                        download={msg.filename || true}
                                                    >
                                                        <FaPaperclip className="me-2"/>
                                                        <span>{msg.filename || 'Download File'}</span>
                                                    </a>
                                                ) : msg.senderId === 'system' ? (
                                                    <div className="message-text system-text">
                                                        <em>{msg.message}</em>
                                                    </div>
                                                ) : (
                                                    <div className="message-text">{msg.message}</div>
                                                )}
                                            </div>
                                            {msg.senderId !== 'system' && msg.timestamp && (
                                                <div className="message-time">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="typing-indicator-area">
                                    {typingUsers.length > 0 && (
                                        <div className="typing-indicator">
                                            <i>
                                                {typingUsers.join(', ')}
                                                {typingUsers.length === 1 ? ' is' : ' are'} typing...
                                            </i>
                                        </div>
                                    )}
                                </div>
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
                                placeholder="Type your message here..."
                                className="message-input"
                                aria-label="Message input"
                                autoComplete="off"
                                disabled={!isConnected}
                            />
                            <Button
                                type="button"
                                variant="light"
                                onClick={() => fileInputRef.current?.click()}
                                className="attachment-button"
                                aria-label="Attach file"
                                title="Attach file"
                                disabled={!isConnected}
                            >
                                <FaPaperclip />
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar,.csv,.xls,.xlsx,.ppt,.pptx"
                            />
                            <Button
                                type="submit"
                                className="send-button"
                                aria-label="Send message"
                                title="Send message"
                                disabled={!message.trim() || !isConnected}
                            >
                                <FaPaperPlane />
                            </Button>
                        </Form>
                        {!isConnected && <Alert variant="danger" className="connection-lost-alert">Connection lost. Attempting to reconnect...</Alert>}
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default Chat; 