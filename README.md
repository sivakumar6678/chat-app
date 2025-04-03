# Real-Time Chat Application

A modern, real-time chat application built with React, Node.js, Express, and Socket.IO. Features include real-time messaging, file sharing, user presence, and typing indicators.

## Features

- Real-time messaging with Socket.IO
- File and image sharing
- User presence (online/offline status)
- Typing indicators
- Room-based chat
- Responsive design
- Regular updates for new messages and users
- Message history persistence
- User-friendly interface

## Tech Stack

- **Frontend:**
  - React.js
  - Socket.IO Client
  - Bootstrap
  - React Icons
  - React Toastify

- **Backend:**
  - Node.js
  - Express.js
  - Socket.IO
  - MongoDB
  - Mongoose

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chat-app
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/chat-app
PORT=5000
```

## Running the Application

1. Start the MongoDB server

2. Start the backend server:
```bash
cd backend
npm start
```

3. Start the frontend development server:
```bash
cd frontend
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter your username and room name
2. Click "Join Chat"
3. Start chatting with other users in the same room
4. Use the attachment button to share files or images
5. See who's online in the user list
6. Messages are automatically updated every minute

## Project Structure

```
chat-app/
├── backend/
│   ├── models/
│   │   ├── Message.js
│   │   └── User.js
│   ├── routes/
│   │   └── api.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.jsx
│   │   │   └── Chat.css
│   │   ├── App.jsx
│   │   └── index.js
│   └── package.json
└── README.md
```

## API Endpoints

- `GET /api/messages/:room` - Get messages for a room
- `GET /api/users/:room` - Get users in a room
- `POST /api/messages` - Save a new message
- `POST /api/users` - Add a new user

## Socket Events

- `join` - User joins a room
- `leave` - User leaves a room
- `message` - New message sent
- `typing` - User is typing
- `stopTyping` - User stopped typing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Socket.IO for real-time communication
- MongoDB for data persistence
- React for the frontend framework
- Bootstrap for UI components 