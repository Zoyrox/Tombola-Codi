const socket = io();
let currentRoom = null;
let playerName = '';
let playerCard = [];

// Entra nel gioco
function joinGame() {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  playerName = document.getElementById('playerNameInput').value.trim();
  
  if (!roomCode) {
    showNotification('Inserisci codice stanza', 'error');
    return;
  }
  
  if (!playerName) {
    showNotification('Inserisci il tuo nome', 'error');
    return;
  }
  
  console.log('Join game:', { roomCode, playerName });
  socket.emit('player-join', { roomCode, playerName });
  showNotification(`Entrando in stanza ${roomCode}...`, 'info');
}

// Lascia gioco
function leaveGame() {
  resetToSetup();
  showNotification('Partita lasciata', 'info');
}

// Genera cartella
function generateCardDisplay() {
  const container = document.getElementById('tombolaCard');
  if (!container) return;
  
  container.innerHTML = '';
  
  for (let row = 0; row < 3; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'card-row';
    
    for (let col = 0; col < 9; col++) {
      const num = playerCard[row][col];
      const numEl = document.createElement('div');
      numEl.className = 'card-number';
      
      if (num !== null) {
        numEl.textContent = num;
        numEl.dataset.number = num;
        numEl.addEventListener('click', () => {
          socket.emit('mark-number', { roomCode: currentRoom, number: num });
        });
      } else {
        numEl.className = 'card-number null';
        numEl.innerHTML = '&nbsp;';
      }
      
      rowEl.appendChild(numEl);
    }
    
    container.appendChild(rowEl);
  }
}

// Reset a setup
function resetToSetup() {
  currentRoom = null;
  playerName = '';
  playerCard = [];
  
  document.getElementById('setupPlayer').style.display = 'block';
  document.getElementById('gamePanel').style.display = 'none';
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
  console.log('✅ Giocatore connesso al server');
  showNotification('Connesso al server!', 'success');
});

socket.on('player-joined', (data) => {
  console.log('Player joined:', data);
  
  if (data.success) {
    currentRoom = data.roomCode;
    playerCard = data.playerCard || [];
    
    document.getElementById('setupPlayer').style.display = 'none';
    document.getElementById('gamePanel').style.display = 'block';
    document.getElementById('playerNameDisplay').textContent = playerName;
    document.getElementById('roomCodeDisplay').textContent = `Stanza: ${currentRoom}`;
    
    generateCardDisplay();
    showNotification(`Benvenuto ${playerName}!`, 'success');
  }
});

socket.on('number-extracted', (data) => {
  console.log('Number extracted (player):', data);
  
  document.getElementById('currentNumberDisplay').textContent = data.number;
  document.getElementById('extractedCount').textContent = data.extractedNumbers.length;
  
  showNotification(`Estratto: ${data.number}`, 'info');
});

socket.on('number-marked', (data) => {
  console.log('Number marked:', data);
  
  // Evidenzia numero nella cartella
  const numEl = document.querySelector(`.card-number[data-number="${data.number}"]`);
  if (numEl) {
    numEl.classList.add('marked');
  }
  
  showNotification(`Numero ${data.number} segnato!`, 'success');
});

socket.on('winner', (data) => {
  const messages = {
    'ambo': 'Ambo! 🎉',
    'terno': 'Terno! 🎊',
    'quaterna': 'Quaterna! 🏆',
    'cinquina': 'Cinquina! 🎖️ TOMBOLA!'
  };
  
  const isMe = data.playerId === socket.id;
  const message = isMe ? 
    `Hai fatto ${messages[data.type]}` : 
    `${data.player} ha fatto ${messages[data.type]}`;
  
  showNotification(message, isMe ? 'success' : 'info');
});

socket.on('game-reset', () => {
  showNotification('Partita resettata', 'info');
  // Reset cartella
  document.querySelectorAll('.card-number.marked').forEach(el => {
    el.classList.remove('marked');
  });
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
  console.log('Player page loaded');
  
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    document.getElementById('roomCodeInput').value = roomParam.toUpperCase();
  }
  
  // Event listener per input
  const inputs = ['roomCodeInput', 'playerNameInput'];
  inputs.forEach(id => {
    document.getElementById(id)?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') joinGame();
    });
  });
});
