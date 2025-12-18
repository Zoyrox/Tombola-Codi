const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configurazione Socket.IO SEMPLICE
const io = new Server(server, {
  cors: {
    origin: "*", // Accetta tutti
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

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

// Stato del gioco
const rooms = {};
const MAX_PLAYERS = 25;

// Genera codice stanza
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Genera cartella
function generateCard() {
  const card = [[], [], []];
  
  // Inizializza tutte le celle a null
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      card[row][col] = null;
    }
  }
  
  // Per ogni riga, scegli 5 colonne casuali per i numeri
  for (let row = 0; row < 3; row++) {
    const positions = [];
    while (positions.length < 5) {
      const pos = Math.floor(Math.random() * 9);
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }
    
    // Assegna numeri validi per ogni colonna scelta
    positions.forEach(col => {
      const min = col * 10 + 1;
      const max = Math.min((col + 1) * 10, 90);
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      card[row][col] = num;
    });
  }
  
  return card;
}

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔗 Nuova connessione:', socket.id);
  
  // DEBUG: Invia evento di test
  socket.emit('test', { message: 'Connesso al server!', time: new Date() });
  
  // ADMIN: Crea stanza
  socket.on('create-room', () => {
    console.log('📢 Richiesta creazione stanza da:', socket.id);
    
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      code: roomCode,
      admin: socket.id,
      players: {},
      extractedNumbers: [],
      currentNumber: null,
      isGameStarted: false,
      winners: {
        ambo: [],
        terno: [],
        quaterna: [],
        cinquina: []
      },
      createdAt: new Date()
    };
    
    // Entra nella stanza
    socket.join(roomCode);
    
    // Risposta all'admin
    socket.emit('room-created', {
      success: true,
      roomCode: roomCode,
      message: `Stanza ${roomCode} creata con successo!`
    });
    
    console.log(`✅ Stanza creata: ${roomCode} da ${socket.id}`);
  });
  
  // ADMIN: Entra in stanza esistente
  socket.on('admin-join', (data) => {
    console.log('📢 Admin join:', data);
    
    const roomCode = data.roomCode?.toUpperCase();
    if (!roomCode || roomCode.length < 4) {
      socket.emit('error', { message: 'Codice stanza non valido' });
      return;
    }
    
    // Crea stanza se non esiste
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        code: roomCode,
        admin: socket.id,
        players: {},
        extractedNumbers: [],
        currentNumber: null,
        isGameStarted: false,
        winners: {
          ambo: [],
          terno: [],
          quaterna: [],
          cinquina: []
        },
        createdAt: new Date()
      };
    } else {
      // Prendi controllo come admin
      rooms[roomCode].admin = socket.id;
    }
    
    socket.join(roomCode);
    
    socket.emit('admin-joined', {
      success: true,
      roomCode: roomCode,
      playerCount: Object.keys(rooms[roomCode].players).length,
      extractedNumbers: rooms[roomCode].extractedNumbers,
      currentNumber: rooms[roomCode].currentNumber,
      isGameStarted: rooms[roomCode].isGameStarted,
      winners: rooms[roomCode].winners
    });
    
    console.log(`✅ Admin ${socket.id} entrato in ${roomCode}`);
  });
  
  // PLAYER: Entra in stanza
  socket.on('player-join', (data) => {
    console.log('📢 Player join:', data);
    
    const { roomCode, playerName } = data;
    const room = rooms[roomCode?.toUpperCase()];
    
    if (!room) {
      socket.emit('error', { message: 'Stanza non trovata!' });
      return;
    }
    
    if (Object.keys(room.players).length >= MAX_PLAYERS) {
      socket.emit('error', { message: 'Stanza piena! Massimo 25 giocatori.' });
      return;
    }
    
    // Controlla nome duplicato
    const existingPlayer = Object.values(room.players).find(p => 
      p.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (existingPlayer) {
      socket.emit('error', { message: 'Nome già in uso!' });
      return;
    }
    
    // Crea giocatore
    const playerCard = generateCard();
    room.players[socket.id] = {
      id: socket.id,
      name: playerName,
      card: playerCard,
      markedNumbers: [],
      wins: [],
      joinedAt: new Date()
    };
    
    socket.join(roomCode);
    
    // Risposta al giocatore
    socket.emit('player-joined', {
      success: true,
      roomCode: room.code,
      playerName: playerName,
      playerCard: playerCard,
      playerCount: Object.keys(room.players).length,
      extractedNumbers: room.extractedNumbers,
      currentNumber: room.currentNumber,
      isGameStarted: room.isGameStarted,
      winners: room.winners
    });
    
    // Notifica admin
    if (room.admin) {
      io.to(room.admin).emit('player-updated', {
        playerCount: Object.keys(room.players).length,
        players: Object.values(room.players).map(p => ({
          id: p.id,
          name: p.name,
          wins: p.wins.length
        }))
      });
    }
    
    console.log(`✅ ${playerName} entrato in ${roomCode}`);
  });
  
  // ADMIN: Estrai numero
  socket.on('extract-number', (roomCode) => {
    console.log('🎲 Extract number in:', roomCode);
    
    const room = rooms[roomCode];
    if (!room || room.admin !== socket.id) {
      socket.emit('error', { message: 'Non autorizzato!' });
      return;
    }
    
    if (room.extractedNumbers.length >= 90) {
      socket.emit('error', { message: 'Tutti i numeri estratti!' });
      return;
    }
    
    // Estrai nuovo numero
    let newNumber;
    do {
      newNumber = Math.floor(Math.random() * 90) + 1;
    } while (room.extractedNumbers.includes(newNumber));
    
    room.extractedNumbers.push(newNumber);
    room.currentNumber = newNumber;
    room.isGameStarted = true;
    
    // Ordina
    room.extractedNumbers.sort((a, b) => a - b);
    
    // Invia a tutti
    io.to(roomCode).emit('number-extracted', {
      number: newNumber,
      extractedNumbers: room.extractedNumbers,
      winners: room.winners
    });
    
    console.log(`🎲 ${roomCode}: estratto ${newNumber}`);
  });
  
  // PLAYER: Segna numero
  socket.on('mark-number', (data) => {
    const { roomCode, number } = data;
    const room = rooms[roomCode];
    
    if (!room) return;
    
    const player = room.players[socket.id];
    if (!player) return;
    
    if (!room.extractedNumbers.includes(number)) {
      socket.emit('error', { message: 'Numero non estratto!' });
      return;
    }
    
    if (!player.markedNumbers.includes(number)) {
      player.markedNumbers.push(number);
      socket.emit('number-marked', {
        number: number,
        markedNumbers: player.markedNumbers
      });
      
      // Controlla vittorie
      checkWins(roomCode, socket.id);
    }
  });
  
  // Reset partita
  socket.on('reset-game', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.admin !== socket.id) {
      socket.emit('error', { message: 'Non autorizzato!' });
      return;
    }
    
    room.extractedNumbers = [];
    room.currentNumber = null;
    room.isGameStarted = false;
    room.winners = { ambo: [], terno: [], quaterna: [], cinquina: [] };
    
    // Reset giocatori
    Object.values(room.players).forEach(player => {
      player.markedNumbers = [];
      player.wins = [];
    });
    
    io.to(roomCode).emit('game-reset', {
      extractedNumbers: [],
      currentNumber: null,
      isGameStarted: false,
      winners: room.winners
    });
    
    console.log(`🔄 ${roomCode}: partita resettata`);
  });
  
  // Disconnessione
  socket.on('disconnect', () => {
    console.log('❌ Disconnesso:', socket.id);
    
    Object.keys(rooms).forEach(roomCode => {
      const room = rooms[roomCode];
      
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        
        // Notifica admin
        if (room.admin) {
          io.to(room.admin).emit('player-updated', {
            playerCount: Object.keys(room.players).length,
            players: Object.values(room.players).map(p => ({
              id: p.id,
              name: p.name,
              wins: p.wins.length
            }))
          });
        }
      }
      
      if (room.admin === socket.id) {
        // Se l'admin si disconnette, chiudi la stanza
        io.to(roomCode).emit('room-closed', { message: 'Admin disconnesso' });
        delete rooms[roomCode];
        console.log(`🚫 ${roomCode}: stanza chiusa`);
      }
    });
  });
  
  // Funzione per controllare vittorie
  function checkWins(roomCode, playerId) {
    const room = rooms[roomCode];
    const player = room?.players[playerId];
    if (!player) return;
    
    const card = player.card;
    const marked = player.markedNumbers;
    
    for (let row = 0; row < 3; row++) {
      const rowNumbers = card[row].filter(n => n !== null);
      const markedInRow = rowNumbers.filter(n => marked.includes(n));
      
      if (markedInRow.length >= 2 && !player.wins.includes('ambo')) {
        player.wins.push('ambo');
        if (!room.winners.ambo.find(w => w.id === playerId)) {
          room.winners.ambo.push({
            id: playerId,
            name: player.name,
            timestamp: new Date(),
            numbers: markedInRow
          });
          
          io.to(roomCode).emit('winner', {
            type: 'ambo',
            player: player.name,
            playerId: playerId,
            numbers: markedInRow
          });
        }
      }
      
      if (markedInRow.length >= 3 && !player.wins.includes('terno')) {
        player.wins.push('terno');
        if (!room.winners.terno.find(w => w.id === playerId)) {
          room.winners.terno.push({
            id: playerId,
            name: player.name,
            timestamp: new Date(),
            numbers: markedInRow
          });
          
          io.to(roomCode).emit('winner', {
            type: 'terno',
            player: player.name,
            playerId: playerId,
            numbers: markedInRow
          });
        }
      }
      
      if (markedInRow.length >= 4 && !player.wins.includes('quaterna')) {
        player.wins.push('quaterna');
        if (!room.winners.quaterna.find(w => w.id === playerId)) {
          room.winners.quaterna.push({
            id: playerId,
            name: player.name,
            timestamp: new Date(),
            numbers: markedInRow
          });
          
          io.to(roomCode).emit('winner', {
            type: 'quaterna',
            player: player.name,
            playerId: playerId,
            numbers: markedInRow
          });
        }
      }
      
      if (markedInRow.length >= 5 && !player.wins.includes('cinquina')) {
        player.wins.push('cinquina');
        if (!room.winners.cinquina.find(w => w.id === playerId)) {
          room.winners.cinquina.push({
            id: playerId,
            name: player.name,
            timestamp: new Date(),
            numbers: markedInRow
          });
          
          io.to(roomCode).emit('winner', {
            type: 'cinquina',
            player: player.name,
            playerId: playerId,
            numbers: markedInRow
          });
        }
      }
    }
  }
});

// Avvia server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎄  TOMBOLA NATALIZIA - SERVER AVVIATO CORRETTAMENTE  🎄');
  console.log('='.repeat(60));
  console.log(`✅  Server in esecuzione: http://localhost:${PORT}`);
  console.log(`👑  Admin: http://localhost:${PORT}/admin.html`);
  console.log(`👤  Player: http://localhost:${PORT}/player.html`);
  console.log('='.repeat(60));
  console.log('\n🚀  PER INIZIARE:');
  console.log('1. Apri due schede del browser');
  console.log('2. Nella prima: vai su /admin.html');
  console.log('3. Clicca "CREA NUOVA STANZA"');
  console.log('4. Copia il codice stanza');
  console.log('5. Nella seconda scheda: vai su /player.html');
  console.log('6. Incolla il codice e inserisci il nome');
  console.log('7. Clicca "ENTRARE NELLA PARTITA"');
  console.log('8. Torna nella scheda Admin e clicca "ESTRAI NUMERO"');
  console.log('='.repeat(60));
});