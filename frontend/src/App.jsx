import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Chat from './components/Chat';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <div className="App">
      <h1>Chat App</h1>
      <Chat />
      <ToastContainer />
    </div>
  );
}

export default App;
