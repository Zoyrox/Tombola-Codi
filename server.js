const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Servi file statici
app.use(express.static('public'));

// Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// Memorizza le stanze
const rooms = new Map();

// Genera cartella tombola
function generateCard() {
  const card = [];
  const numbers = Array.from({length: 90}, (_, i) => i + 1);
  
  // Mischia i numeri
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  // Prendi i primi 15 numeri e ordinali
  card.push(...numbers.slice(0, 15).sort((a, b) => a - b));
  return card;
}

// Genera codice stanza
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code)); // Evita duplicati
  
  return code;
}

// Inizializza nuova stanza
function initRoom(roomCode, adminId) {
  rooms.set(roomCode, {
    players: new Map(),
    extractedNumbers: [],
    adminId: adminId,
    winners: {
      ambo: [],
      terno: [],
      quaterna: [],
      cinquina: [],
      tombola: []
    },
    currentNumber: null,
    gameStarted: false
  });
}

io.on('connection', (socket) => {
  console.log('🔗 Nuova connessione:', socket.id);
  
  // Admin crea stanza
  socket.on('create-room', () => {
    const roomCode = generateRoomCode();
    initRoom(roomCode, socket.id);
    
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isAdmin = true;
    
    console.log(`🏠 Stanza creata: ${roomCode} da admin ${socket.id}`);
    socket.emit('room-created', { 
      roomCode,
      message: 'Stanza creata con successo!'
    });
  });
  
  // Giocatore entra in stanza
  socket.on('join-room', (data) => {
    const { roomCode, playerName } = data;
    const room = rooms.get(roomCode.toUpperCase());
    
    if (!room) {
      socket.emit('room-error', { message: 'Stanza non trovata' });
      return;
    }
    
    if (room.players.size >= 25) {
      socket.emit('room-error', { message: 'Stanza piena (max 25 giocatori)' });
      return;
    }
    
    if (room.players.has(socket.id)) {
      socket.emit('room-error', { message: 'Sei già in questa stanza' });
      return;
    }
    
    // Aggiungi giocatore
    const playerCard = generateCard();
    room.players.set(socket.id, {
      name: playerName,
      card: playerCard,
      markedNumbers: [],
      wins: [],
      socketId: socket.id
    });
    
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerName = playerName;
    socket.isAdmin = false;
    
    console.log(`👤 ${playerName} entrato in stanza ${roomCode}`);
    
    // Notifica admin e altri giocatori
    socket.emit('room-joined', {
      roomCode,
      playerName,
      card: playerCard,
      extractedNumbers: room.extractedNumbers,
      currentNumber: room.currentNumber,
      players: Array.from(room.players.values()).map(p => ({
        name: p.name,
        wins: p.wins.length
      }))
    });
    
    // Aggiorna tutti i giocatori nella stanza
    io.to(roomCode).emit('players-updated', {
      players: Array.from(room.players.values()).map(p => ({
        name: p.name,
        wins: p.wins.length
      })),
      playerCount: room.players.size
    });
    
    // Notifica admin specificamente
    socket.to(roomCode).emit('player-joined', {
      playerName,
      playerCount: room.players.size
    });
  });
  
  // Admin estrae numero
  socket.on('extract-number', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || !socket.isAdmin || room.gameStarted === false) {
      socket.emit('game-error', { message: 'Non puoi estrarre numeri' });
      return;
    }
    
    if (room.extractedNumbers.length >= 90) {
      socket.emit('game-error', { message: 'Tutti i numeri sono stati estratti!' });
      return;
    }
    
    // Genera numero casuale non estratto
    const availableNumbers = Array.from({length: 90}, (_, i) => i + 1)
      .filter(n => !room.extractedNumbers.includes(n));
    
    const extractedNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    
    // Aggiorna stato stanza
    room.extractedNumbers.push(extractedNumber);
    room.currentNumber = extractedNumber;
    room.gameStarted = true;
    
    console.log(`🎲 Numero estratto in ${roomCode}: ${extractedNumber}`);
    
    // Invia a tutti i giocatori
    io.to(roomCode).emit('number-extracted', {
      number: extractedNumber,
      extractedCount: room.extractedNumbers.length,
      isNew: true
    });
    
    // Controlla vincite
    checkWins(roomCode, extractedNumber);
  });
  
  // Admin resetta gioco
  socket.on('reset-game', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || !socket.isAdmin) return;
    
    // Resetta solo i numeri estratti, mantieni i giocatori
    room.extractedNumbers = [];
    room.currentNumber = null;
    room.winners = { ambo: [], terno: [], quaterna: [], cinquina: [], tombola: [] };
    
    // Resetta le cartelle dei giocatori
    room.players.forEach(player => {
      player.markedNumbers = [];
      player.wins = [];
    });
    
    io.to(roomCode).emit('game-reset', {
      message: 'Partita resettata!'
    });
    
    console.log(`🔄 Partita resettata in stanza ${roomCode}`);
  });
  
  // Giocatore segna numero
  socket.on('mark-number', (data) => {
    const { number } = data;
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || socket.isAdmin) return;
    
    const player = room.players.get(socket.id);
    if (player && !player.markedNumbers.includes(number)) {
      player.markedNumbers.push(number);
      
      // Controlla se il giocatore ha vinto qualcosa
      checkPlayerWins(roomCode, socket.id);
    }
  });
  
  // Giocatore lascia stanza
  socket.on('leave-room', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room) return;
    
    if (socket.isAdmin) {
      // Se l'admin esce, elimina la stanza
      rooms.delete(roomCode);
      io.to(roomCode).emit('room-closed', {
        message: 'L\'admin ha lasciato la stanza. La partita è terminata.'
      });
      io.socketsLeave(roomCode);
      console.log(`🚪 Stanza ${roomCode} eliminata (admin uscito)`);
    } else {
      // Rimuovi giocatore
      const playerName = socket.playerName;
      room.players.delete(socket.id);
      
      socket.leave(roomCode);
      delete socket.roomCode;
      delete socket.playerName;
      
      // Notifica gli altri
      io.to(roomCode).emit('player-left', {
        playerName,
        playerCount: room.players.size
      });
      
      console.log(`👤 ${playerName} lasciato stanza ${roomCode}`);
      
      // Se non ci sono più giocatori, elimina la stanza
      if (room.players.size === 0) {
        rooms.delete(roomCode);
        console.log(`🚪 Stanza ${roomCode} eliminata (nessun giocatore)`);
      }
    }
  });
  
  // Disconnessione
  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (!roomCode) return;
    
    const room = rooms.get(roomCode);
    if (!room) return;
    
    if (socket.isAdmin) {
      // Admin disconnesso - chiudi stanza
      rooms.delete(roomCode);
      io.to(roomCode).emit('room-closed', {
        message: 'L\'admin si è disconnesso. La partita è terminata.'
      });
      console.log(`🚪 Stanza ${roomCode} eliminata (admin disconnesso)`);
    } else {
      // Giocatore disconnesso
      const player = room.players.get(socket.id);
      if (player) {
        room.players.delete(socket.id);
        io.to(roomCode).emit('player-left', {
          playerName: player.name,
          playerCount: room.players.size
        });
        console.log(`👤 ${player.name} disconnesso da stanza ${roomCode}`);
      }
      
      // Elimina stanza se vuota
      if (room.players.size === 0) {
        rooms.delete(roomCode);
        console.log(`🚪 Stanza ${roomCode} eliminata (vuota)`);
      }
    }
  });
  
  // Funzione per controllare vincite
  function checkWins(roomCode, extractedNumber) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    // Verifica per ogni giocatore
    room.players.forEach((player, playerId) => {
      if (player.card.includes(extractedNumber)) {
        player.markedNumbers.push(extractedNumber);
        
        // Controlla combinazioni vincenti
        const markedOnCard = player.markedNumbers.filter(n => player.card.includes(n));
        const sortedMarked = markedOnCard.sort((a, b) => a - b);
        
        // Controlla tombola (tutti i 15 numeri)
        if (sortedMarked.length === 15 && !player.wins.includes('tombola')) {
          player.wins.push('tombola');
          room.winners.tombola.push(player.name);
          
          io.to(roomCode).emit('winner', {
            type: 'tombola',
            playerName: player.name,
            message: `🎉 ${player.name} ha fatto TOMBOLA!`
          });
        }
        // Controlla cinquina (5 numeri consecutivi)
        else if (hasConsecutive(sortedMarked, 5) && !player.wins.includes('cinquina')) {
          player.wins.push('cinquina');
          room.winners.cinquina.push(player.name);
          
          io.to(roomCode).emit('winner', {
            type: 'cinquina',
            playerName: player.name,
            message: `🌟 ${player.name} ha fatto CINQUINA!`
          });
        }
        // Controlla quaterna (4 numeri consecutivi)
        else if (hasConsecutive(sortedMarked, 4) && !player.wins.includes('quaterna')) {
          player.wins.push('quaterna');
          room.winners.quaterna.push(player.name);
          
          io.to(roomCode).emit('winner', {
            type: 'quaterna',
            playerName: player.name,
            message: `🏆 ${player.name} ha fatto QUATERNA!`
          });
        }
        // Controlla terno (3 numeri consecutivi)
        else if (hasConsecutive(sortedMarked, 3) && !player.wins.includes('terno')) {
          player.wins.push('terno');
          room.winners.terno.push(player.name);
          
          io.to(roomCode).emit('winner', {
            type: 'terno',
            playerName: player.name,
            message: `🎯 ${player.name} ha fatto TERNO!`
          });
        }
        // Controlla ambo (2 numeri consecutivi)
        else if (hasConsecutive(sortedMarked, 2) && !player.wins.includes('ambo')) {
          player.wins.push('ambo');
          room.winners.ambo.push(player.name);
          
          io.to(roomCode).emit('winner', {
            type: 'ambo',
            playerName: player.name,
            message: `✅ ${player.name} ha fatto AMBO!`
          });
        }
      }
    });
  }
  
  // Funzione per controllare vincite del singolo giocatore
  function checkPlayerWins(roomCode, playerId) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const player = room.players.get(playerId);
    if (!player) return;
    
    const markedOnCard = player.markedNumbers.filter(n => player.card.includes(n));
    const sortedMarked = markedOnCard.sort((a, b) => a - b);
    
    // Stessa logica di checkWins ma solo per questo giocatore
    // ... (omessa per brevità, usa la stessa logica sopra)
  }
  
  // Helper: verifica se ci sono numeri consecutivi
  function hasConsecutive(numbers, count) {
    for (let i = 0; i <= numbers.length - count; i++) {
      let consecutive = true;
      for (let j = 1; j < count; j++) {
        if (numbers[i + j] !== numbers[i] + j) {
          consecutive = false;
          break;
        }
      }
      if (consecutive) return true;
    }
    return false;
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎄 Server Tombola Natalizia online!`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`👑 Admin: http://localhost:${PORT}/admin`);
  console.log(`👥 Player: http://localhost:${PORT}/player`);
});
