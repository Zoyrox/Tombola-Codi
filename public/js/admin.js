const socket = io();
let currentRoom = null;

// Crea stanza
function createRoom() {
  console.log('Cliccato: Crea Stanza');
  socket.emit('create-room');
  showNotification('Creazione stanza in corso...', 'info');
}

// Entra in stanza
function joinRoom() {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!roomCode) {
    showNotification('Inserisci un codice stanza', 'error');
    return;
  }
  
  console.log('Tentativo di entrare in stanza:', roomCode);
  socket.emit('admin-join', { roomCode: roomCode });
  showNotification(`Entrando in stanza ${roomCode}...`, 'info');
}

// Estrai numero
function extractNumber() {
  if (!currentRoom) {
    showNotification('Non sei in una stanza!', 'error');
    return;
  }
  
  socket.emit('extract-number', currentRoom);
  showNotification('Estrazione numero...', 'info');
}

// Reset
function resetGame() {
  if (!currentRoom) {
    showNotification('Non sei in una stanza!', 'error');
    return;
  }
  
  if (confirm('Resettare la partita?')) {
    socket.emit('reset-game', currentRoom);
  }
}

// Lascia stanza
function leaveRoom() {
  if (currentRoom) {
    resetToSetup();
    showNotification('Stanza lasciata', 'info');
  }
}

// Mostra setup
function showSetup() {
  document.getElementById('setupRoom').style.display = 'block';
  document.getElementById('gamePanel').style.display = 'none';
}

// Mostra gioco
function showGame() {
  document.getElementById('setupRoom').style.display = 'none';
  document.getElementById('gamePanel').style.display = 'block';
}

// Reset a setup
function resetToSetup() {
  currentRoom = null;
  showSetup();
}

// Notifiche
function showNotification(message, type) {
  console.log(`Notification [${type}]:`, message);
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Socket event listeners
socket.on('connect', () => {
  console.log('✅ Connesso al server Socket.IO');
  showNotification('Connesso al server!', 'success');
});

socket.on('test', (data) => {
  console.log('Test dal server:', data);
});

socket.on('room-created', (data) => {
  console.log('Room created:', data);
  
  if (data.success) {
    currentRoom = data.roomCode;
    
    document.getElementById('roomCodeDisplay').textContent = currentRoom;
    document.getElementById('roomStatus').textContent = 'Stanza creata! Condividi il codice.';
    
    showGame();
    showNotification(`Stanza ${currentRoom} creata!`, 'success');
    
    // Mostra il codice da condividere
    const shareUrl = `${window.location.origin}/player.html?room=${currentRoom}`;
    alert(`🎉 STANZA CREATA!\n\nCodice: ${currentRoom}\n\nCondividi questo link con i giocatori:\n${shareUrl}`);
  }
});

socket.on('admin-joined', (data) => {
  console.log('Admin joined:', data);
  
  if (data.success) {
    currentRoom = data.roomCode;
    
    document.getElementById('roomCodeDisplay').textContent = currentRoom;
    document.getElementById('roomStatus').textContent = `Giocatori: ${data.playerCount}`;
    document.getElementById('playerCount').textContent = data.playerCount;
    
    showGame();
    showNotification(`Entrato in stanza ${currentRoom}`, 'success');
  }
});

socket.on('player-updated', (data) => {
  console.log('Player updated:', data);
  
  document.getElementById('playerCount').textContent = data.playerCount;
  document.getElementById('roomStatus').textContent = `Giocatori: ${data.playerCount}`;
  
  // Aggiorna lista giocatori
  const container = document.getElementById('playersList');
  if (data.players.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center;">Nessun giocatore</div>';
  } else {
    container.innerHTML = data.players.map(p => `
      <div class="player-card">
        <strong>${p.name}</strong>
        <div>Vittorie: ${p.wins}</div>
      </div>
    `).join('');
  }
});

socket.on('number-extracted', (data) => {
  console.log('Number extracted:', data);
  
  document.getElementById('currentNumberDisplay').textContent = data.number;
  document.getElementById('extractedCount').textContent = data.extractedNumbers.length;
  
  showNotification(`Estratto: ${data.number}`, 'info');
});

socket.on('winner', (data) => {
  const messages = {
    'ambo': 'Ambo! 🎉',
    'terno': 'Terno! 🎊',
    'quaterna': 'Quaterna! 🏆',
    'cinquina': 'Cinquina! 🎖️ TOMBOLA!'
  };
  
  showNotification(`${data.player} ha fatto ${messages[data.type]}`, 'success');
});

socket.on('game-reset', () => {
  showNotification('Partita resettata', 'info');
});

socket.on('error', (data) => {
  console.error('Socket error:', data);
  showNotification(data.message || 'Errore', 'error');
});

socket.on('room-closed', (data) => {
  showNotification(data.message || 'Stanza chiusa', 'warning');
  resetToSetup();
});

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin page loaded');
  
  // Inizializza tabellone (semplice)
  const board = document.getElementById('tombolaBoard');
  if (board) {
    for (let i = 1; i <= 90; i++) {
      const num = document.createElement('div');
      num.className = 'board-number';
      num.textContent = i;
      num.id = `board-${i}`;
      board.appendChild(num);
    }
  }
  
  // Event listener per input
  document.getElementById('roomCodeInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
  });
});
