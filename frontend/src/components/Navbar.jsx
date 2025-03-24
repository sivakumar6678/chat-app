import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { FaUsers, FaSignOutAlt, FaHome, FaInfoCircle, FaMoon, FaSun } from 'react-icons/fa';
import './Navbar.css';

const NavigationBar = ({ username = '', onlineUsers = [], onLogout, isJoined = false }) => {
    const [darkMode, setDarkMode] = React.useState(false);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.body.classList.toggle('dark-mode');
    };

    return (
        <Navbar 
            bg={darkMode ? "dark" : "light"} 
            variant={darkMode ? "dark" : "light"} 
            expand="lg" 
            className="modern-navbar"
        >
            <Container>
                <Navbar.Brand href="#home" className="brand-container">
                    <div className="logo-animation">💬</div>
                    <span className="brand-text">ChatApp</span>
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link href="#home" className="nav-link-custom">
                            <FaHome className="nav-icon" />
                            Home
                        </Nav.Link>
                        <Nav.Link href="#about" className="nav-link-custom">
                            <FaInfoCircle className="nav-icon" />
                            About
                        </Nav.Link>
                    </Nav>
                    <Nav className="align-items-center">
                        <Nav.Link className="nav-link-custom">
                            <FaUsers className="nav-icon" />
                            <Badge bg="success" className="user-count">
                                {onlineUsers?.length || 0}
                            </Badge>
                            Online
                        </Nav.Link>
                        {username && isJoined && (
                            <Nav.Link className="nav-link-custom user-profile">
                                <div className="username-container">
                                    <div className="avatar">{username[0].toUpperCase()}</div>
                                    <span className="username">{username}</span>
                                </div>
                                <FaSignOutAlt 
                                    onClick={onLogout} 
                                    className="logout-icon"
                                />
                            </Nav.Link>
                        )}
                        <Nav.Link 
                            className="nav-link-custom theme-toggle"
                            onClick={toggleDarkMode}
                        >
                            {darkMode ? <FaSun /> : <FaMoon />}
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationBar; 