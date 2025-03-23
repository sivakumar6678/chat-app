import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { FaUsers, FaSignOutAlt, FaHome, FaInfoCircle } from 'react-icons/fa';

const NavigationBar = ({ username, onlineUsers, onLogout }) => {
    return (
        <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
            <Container>
                <Navbar.Brand href="#home" className="d-flex align-items-center">
                    <span className="me-2">💬</span>
                    ChatApp
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link href="#home" className="d-flex align-items-center">
                            <FaHome className="me-2" />
                            Home
                        </Nav.Link>
                        <Nav.Link href="#about" className="d-flex align-items-center">
                            <FaInfoCircle className="me-2" />
                            About
                        </Nav.Link>
                    </Nav>
                    <Nav className="d-flex align-items-center">
                        <Nav.Link className="d-flex align-items-center">
                            <FaUsers className="me-2" />
                            <Badge bg="success" className="me-2">{onlineUsers.length}</Badge>
                            Online Users
                        </Nav.Link>
                        <Nav.Link className="d-flex align-items-center">
                            <span className="me-2">👤 {username}</span>
                            <FaSignOutAlt 
                                onClick={onLogout} 
                                style={{ cursor: 'pointer' }}
                                className="text-danger"
                            />
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavigationBar; 