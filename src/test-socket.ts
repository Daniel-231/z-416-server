import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Socket Connection:', socket.id);
    socket.disconnect();
});

socket.on('connect_error', (err) => {
    console.log('connect_error:', err.message);
});