import React from 'react';
import { ListGroup, Badge } from 'react-bootstrap';
import { FaUser, FaUsers } from 'react-icons/fa';

const UserList = ({ onlineUsers, selectedUser, onUserSelect }) => {
    return (
        <div className="user-list">
            <div className="user-list-header">
                <h4>Online Users</h4>
                <Badge bg="success">{onlineUsers.length}</Badge>
            </div>
            <ListGroup>
                <ListGroup.Item
                    action
                    active={!selectedUser}
                    onClick={() => onUserSelect(null)}
                    className="d-flex align-items-center"
                >
                    <FaUsers className="me-2" />
                    General Chat
                </ListGroup.Item>
                {onlineUsers.map((user) => (
                    <ListGroup.Item
                        key={user.id}
                        action
                        active={selectedUser?.id === user.id}
                        onClick={() => onUserSelect(user)}
                        className="d-flex align-items-center"
                    >
                        <FaUser className="me-2" />
                        {user.username}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </div>
    );
};

export default UserList; 