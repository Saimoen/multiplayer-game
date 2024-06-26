const express = require('express');
const server = express();
const http = require('http').createServer(server);
const cors = require('cors');
const io = require('socket.io')(http, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

server.use(cors());
server.use(express.static(__dirname + "/client/"));

let players = [];

io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id);

    // Add new player
    const player = { id: socket.id, x: 100, y: 100 }; // Default position
    players.push(player);

    // Send the updated players list to all clients
    io.emit('update-players', players);
    
    // Emit start-game event when there are two players
    if (players.length === 2) {
        console.log('Two players connected, ready to start the game...');
        io.emit('start-game');
    }

    // Handle start-game event from any player
    socket.on('start-game', () => {
        if (players.length === 2) {
            io.emit('update-players', players);
            io.emit('launch-game');
            console.log('Game launched by player:', socket.id);
        }
    });

    // Handle player movement
    socket.on('move-player', (movement) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            player.x += movement.x;
            player.y += movement.y;
            io.emit('update-players', players);
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log('user disconnected: ' + socket.id);
        players = players.filter(p => p.id !== socket.id);
        io.emit('update-players', players);
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
