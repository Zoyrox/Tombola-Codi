const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('public'));

// Memorizza le stanze
const rooms = new Map();

// Genera codice stanza unico
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Inizializza una nuova stanza
function createRoom(adminSocketId) {
    const roomCode = generateRoomCode();
    
    const room = {
        code: roomCode,
        admin: adminSocketId,
        players: new Map(),
        extractedNumbers: [],
        lastNumber: null,
        status: 'waiting'
    };
    
    rooms.set(roomCode, room);
    return roomCode;
}

io.on('connection', (socket) => {
    console.log('Nuova connessione:', socket.id);

    // ADMIN: Crea una stanza
    socket.on('create-room', () => {
        const roomCode = createRoom(socket.id);
        socket.join(roomCode);
        
        socket.emit('room-created', {
            roomCode: roomCode,
            link: `${process.env.BASE_URL || 'http://localhost:3000'}/player.html?room=${roomCode}`
        });
        
        console.log(`Stanza creata: ${roomCode} da ${socket.id}`);
    });

    // Giocatore: Unisciti a stanza
    socket.on('join-room', (data) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', 'Stanza non trovata');
            return;
        }
        
        if (room.players.has(socket.id)) {
            socket.emit('error', 'Sei già in questa stanza');
            return;
        }
        
        // Aggiungi giocatore
        room.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            cards: generatePlayerCards(),
            hasTombola: false
        });
        
        socket.join(roomCode);
        
        // Notifica admin
        socket.to(roomCode).emit('player-joined', {
            playerId: socket.id,
            playerName: playerName,
            totalPlayers: room.players.size
        });
        
        // Invia stato al nuovo giocatore
        socket.emit('room-joined', {
            roomCode: roomCode,
            players: Array.from(room.players.values()),
            extractedNumbers: room.extractedNumbers,
            lastNumber: room.lastNumber
        });
        
        console.log(`${playerName} si è unito a ${roomCode}`);
    });

    // Admin: Estrai numero
    socket.on('extract-number', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room || socket.id !== room.admin) return;
        
        // Estrai numero non ancora estratto (1-90)
        let number;
        do {
            number = Math.floor(Math.random() * 90) + 1;
        } while (room.extractedNumbers.includes(number));
        
        room.extractedNumbers.push(number);
        room.lastNumber = number;
        
        // Invia a tutti nella stanza
        io.to(roomCode).emit('number-extracted', {
            number: number,
            extractedNumbers: room.extractedNumbers,
            totalExtracted: room.extractedNumbers.length
        });
        
        console.log(`Numero estratto in ${roomCode}: ${number}`);
    });

    // Giocatore: Chiama Tombola
    socket.on('call-tombola', (data) => {
        const { roomCode, playerName } = data;
        io.to(roomCode).emit('tombola-called', {
            playerName: playerName,
            timestamp: new Date().toLocaleTimeString()
        });
    });

    // Disconnessione
    socket.on('disconnect', () => {
        // Rimuovi giocatore da tutte le stanze
        rooms.forEach((room, roomCode) => {
            if (room.players.has(socket.id)) {
                const playerName = room.players.get(socket.id).name;
                room.players.delete(socket.id);
                
                // Notifica gli altri
                socket.to(roomCode).emit('player-left', {
                    playerId: socket.id,
                    playerName: playerName,
                    totalPlayers: room.players.size
                });
                
                // Se l'admin esce, chiudi la stanza
                if (socket.id === room.admin) {
                    io.to(roomCode).emit('room-closed');
                    rooms.delete(roomCode);
                }
            }
        });
    });
});

// Genera cartelle per giocatore
function generatePlayerCards() {
    const cards = [];
    for (let c = 0; c < 3; c++) {
        const card = [];
        const numbers = new Set();
        while (numbers.size < 15) {
            numbers.add(Math.floor(Math.random() * 90) + 1);
        }
        card.push(...Array.from(numbers));
        cards.push(card);
    }
    return cards;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server Tombola in esecuzione su porta ${PORT}`);
});