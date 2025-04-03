## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd chat-app
    ```

2.  **Backend Setup:**
    *   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```
    *   Create a `.env` file in the `backend` directory and add your MongoDB connection string:
        ```env
        MONGODB_URI=mongodb://localhost:27017/chatapp # Or your MongoDB Atlas/Cloud URI
        PORT=5000 # Optional: Default port is 5000
        ```
    *   Make sure you have MongoDB server running locally or accessible via the connection string.
    *   Create the `uploads` directory if it doesn't exist:
        ```bash
        mkdir uploads
        ```

3.  **Frontend Setup:**
    *   Navigate to the frontend directory:
        ```bash
        cd ../frontend
        ```
    *   Install dependencies:
        ```bash
        npm install
        ```

## Running the Application

1.  **Start the Backend Server:**
    *   Navigate to the `backend` directory:
        ```bash
        cd ../backend
        ```
    *   Run the server:
        ```bash
        node server.js
        # Or using nodemon for development (if installed: npm install -g nodemon)
        # nodemon server.js
        ```
    *   The server should start, typically on port 5000, and connect to MongoDB.

2.  **Start the Frontend Development Server:**
    *   Navigate to the `frontend` directory:
        ```bash
        cd ../frontend
        ```
    *   Run the React development server:
        ```bash
        npm start
        ```
    *   This will usually open the application automatically in your default web browser at `http://localhost:3000`.

Now you can open two browser tabs/windows to `http://localhost:3000`, enter different usernames for the same room, and start chatting!
