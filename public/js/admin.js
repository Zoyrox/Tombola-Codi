const socket = io();
let currentRoom = null;
let gameState = {
    extractedNumbers: [],
    currentNumber: null,
    players: [],
    winners: {
        ambo: [],
        terno: [],
        quaterna: [],
        cinquina: []
    }
};

// Inizializza tabellone
function initializeBoard() {
    const board = document.getElementById('tombolaBoard');
    board.innerHTML = '';
    
    for (let i = 1; i <= 90; i++) {
        const numberElement = document.createElement('div');
        numberElement.className = 'board-number';
        numberElement.textContent = i;
        numberElement.id = `board-${i}`;
        board.appendChild(numberElement);
    }
}

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

// Reset partita
function resetGame() {
    if (!currentRoom) {
        showNotification('Non sei in una stanza!', 'error');
        return;
    }
    
    if (confirm('Sei sicuro di voler resettare la partita?')) {
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

// ========== FUNZIONI PER AGGIORNARE IL TABELLONE ==========

// Aggiorna tabellone con numeri estratti
function updateBoard() {
    // Reset tutti i numeri
    document.querySelectorAll('.board-number').forEach(el => {
        el.classList.remove('extracted', 'current');
    });
    
    // Segna tutti i numeri estratti
    if (gameState.extractedNumbers && gameState.extractedNumbers.length > 0) {
        gameState.extractedNumbers.forEach(num => {
            const element = document.getElementById(`board-${num}`);
            if (element) {
                element.classList.add('extracted');
            }
        });
    }
    
    // Evidenzia il numero corrente
    if (gameState.currentNumber) {
        const currentElement = document.getElementById(`board-${gameState.currentNumber}`);
        if (currentElement) {
            currentElement.classList.add('current');
            
            // Scroll automatico per vedere il numero
            currentElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center' 
            });
        }
    }
}

// Aggiorna lista numeri estratti
function updateExtractedNumbers() {
    const container = document.getElementById('extractedNumbersList');
    container.innerHTML = '';
    
    if (gameState.extractedNumbers && gameState.extractedNumbers.length > 0) {
        gameState.extractedNumbers.forEach(num => {
            const numberElement = document.createElement('div');
            numberElement.className = 'extracted-number';
            numberElement.textContent = num;
            
            // Evidenzia se è il numero corrente
            if (num === gameState.currentNumber) {
                numberElement.style.background = 'linear-gradient(45deg, #ffd700, #ff9f43)';
                numberElement.style.border = '2px solid white';
                numberElement.style.boxShadow = '0 0 15px #ffd700';
                numberElement.style.animation = 'pulse 1s infinite';
            }
            
            container.appendChild(numberElement);
        });
        
        // Scorri fino all'ultimo numero
        container.scrollTop = container.scrollHeight;
    } else {
        container.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.7;">Nessun numero estratto</div>';
    }
    
    // Aggiorna contatore
    document.getElementById('extractedCount').textContent = gameState.extractedNumbers.length;
    document.getElementById('totalExtracted').textContent = gameState.extractedNumbers.length;
}

// Aggiorna vincitori
function updateWinners() {
    const categories = ['ambo', 'terno', 'quaterna', 'cinquina'];
    
    categories.forEach(category => {
        const container = document.getElementById(`${category}Winners`);
        const winners = gameState.winners[category] || [];
        
        container.innerHTML = '';
        
        if (winners.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; opacity: 0.7;">Nessun vincitore</div>';
        } else {
            winners.forEach(winner => {
                const winnerElement = document.createElement('div');
                winnerElement.className = 'winner-item';
                winnerElement.innerHTML = `
                    <strong>${winner.name || winner.playerName || 'Giocatore'}</strong>
                    <div style="font-size: 0.8em; opacity: 0.8;">
                        ${winner.timestamp ? new Date(winner.timestamp).toLocaleTimeString('it-IT') : 'Ora'}
                    </div>
                `;
                container.appendChild(winnerElement);
            });
        }
    });
}

// Aggiorna giocatori
function updatePlayers() {
    const container = document.getElementById('playersList');
    const players = gameState.players || [];
    
    container.innerHTML = '';
    
    if (players.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; opacity: 0.7;">
                <i class="fas fa-user-friends" style="font-size: 3rem; margin-bottom: 10px; display: block;"></i>
                <p>Nessun giocatore ancora...</p>
                <p style="font-size: 0.9rem;">Condividi il codice stanza per invitare giocatori</p>
            </div>
        `;
    } else {
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-card';
            playerElement.innerHTML = `
                <strong>${player.name}</strong>
                <div style="margin-top: 5px; font-size: 0.9em;">
                    <div>Vittorie: ${player.wins || 0}</div>
                    <div>Numeri segnati: ${player.markedCount || player.markedNumbers?.length || 0}</div>
                </div>
            `;
            container.appendChild(playerElement);
        });
    }
    
    // Aggiorna contatori
    document.getElementById('playerCount').textContent = players.length;
    document.getElementById('playersCount').textContent = players.length;
}

// Aggiorna tutto
function updateUI() {
    updateBoard();           // Tabellone
    updateExtractedNumbers(); // Lista numeri estratti
    updateWinners();         // Vincitori
    updatePlayers();         // Giocatori
    
    // Numero corrente
    if (gameState.currentNumber) {
        document.getElementById('currentNumberDisplay').textContent = gameState.currentNumber;
    } else {
        document.getElementById('currentNumberDisplay').textContent = '--';
    }
    
    // Stato stanza
    const roomStatus = document.getElementById('roomStatus');
    if (gameState.extractedNumbers && gameState.extractedNumbers.length > 0) {
        roomStatus.textContent = `${gameState.extractedNumbers.length} numeri estratti`;
    } else {
        roomStatus.textContent = 'In attesa di giocatori...';
    }
    
    // Mostra codice stanza
    if (currentRoom) {
        document.getElementById('roomCodeDisplay').textContent = currentRoom;
    }
}

// ========== GESTIONE STATO ==========

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
    gameState = {
        extractedNumbers: [],
        currentNumber: null,
        players: [],
        winners: { ambo: [], terno: [], quaterna: [], cinquina: [] }
    };
    
    showSetup();
    updateUI();
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

// ========== SOCKET.IO LISTENERS ==========

socket.on('connect', () => {
    console.log('✅ Connesso al server Socket.IO');
    showNotification('Connesso al server!', 'success');
});

socket.on('connected', (data) => {
    console.log('Server connected:', data);
});

socket.on('room-created', (data) => {
    console.log('Room created:', data);
    
    if (data.success) {
        currentRoom = data.roomCode;
        gameState.extractedNumbers = [];
        gameState.currentNumber = null;
        
        document.getElementById('roomCodeDisplay').textContent = currentRoom;
        document.getElementById('roomStatus').textContent = 'Stanza creata!';
        
        showGame();
        showNotification(`Stanza ${currentRoom} creata!`, 'success');
        
        // Mostra il codice da condividere
        const shareUrl = `${window.location.origin}/player.html?room=${currentRoom}`;
        console.log('Condividi questo link:', shareUrl);
    }
});

socket.on('admin-joined', (data) => {
    console.log('Admin joined:', data);
    
    if (data.success) {
        currentRoom = data.roomCode;
        
        // Aggiorna stato del gioco
        gameState.extractedNumbers = data.extractedNumbers || [];
        gameState.currentNumber = data.currentNumber;
        gameState.winners = data.winners || { ambo: [], terno: [], quaterna: [], cinquina: [] };
        
        document.getElementById('roomCodeDisplay').textContent = currentRoom;
        
        showGame();
        showNotification(`Entrato in stanza ${currentRoom}`, 'success');
        
        updateUI();
    }
});

socket.on('number-extracted', (data) => {
    console.log('Number extracted:', data);
    
    // Aggiorna stato
    gameState.extractedNumbers = data.extractedNumbers || [];
    gameState.currentNumber = data.number;
    gameState.winners = data.winners || gameState.winners;
    
    // Aggiorna UI
    updateUI();
    
    // Notifica
    showNotification(`Numero estratto: ${data.number}`, 'info');
    
    // Suono (se supportato)
    playExtractionSound();
});

socket.on('players-updated', (data) => {
    console.log('Players updated:', data);
    
    // Aggiorna lista giocatori
    gameState.players = data.players || [];
    
    // Aggiorna contatori
    document.getElementById('playerCount').textContent = data.playerCount;
    document.getElementById('playersCount').textContent = data.playerCount;
    
    updatePlayers();
});

socket.on('new-player', (data) => {
    console.log('New player:', data);
    showNotification(`${data.playerName} si è unito alla partita!`, 'info');
});

socket.on('winner', (data) => {
    console.log('Winner:', data);
    
    const messages = {
        'ambo': 'Ambo! 🎉 (2 numeri)',
        'terno': 'Terno! 🎊 (3 numeri)',
        'quaterna': 'Quaterna! 🏆 (4 numeri)',
        'cinquina': 'Cinquina! 🎖️ (5 numeri - Tombola!)'
    };
    
    showNotification(`${data.player} ha fatto ${messages[data.type]}`, 'success');
    
    // Aggiorna lista vincitori
    if (gameState.winners[data.type]) {
        gameState.winners[data.type].push({
            name: data.player,
            timestamp: data.timestamp || new Date()
        });
    }
    
    updateWinners();
});

socket.on('game-reset', (data) => {
    console.log('Game reset:', data);
    
    // Reset stato
    gameState.extractedNumbers = data.extractedNumbers || [];
    gameState.currentNumber = data.currentNumber;
    gameState.winners = data.winners || { ambo: [], terno: [], quaterna: [], cinquina: [] };
    
    updateUI();
    showNotification('Partita resettata!', 'info');
});

socket.on('error', (data) => {
    console.error('Socket error:', data);
    showNotification(data.message || 'Errore', 'error');
});

socket.on('room-closed', (data) => {
    console.log('Room closed:', data);
    showNotification(data.message || 'Stanza chiusa', 'warning');
    resetToSetup();
});

// ========== FUNZIONI AUSILIARIE ==========

function playExtractionSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio non supportato');
    }
}

// ========== INIZIALIZZAZIONE ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin page loaded');
    
    // Inizializza tabellone
    initializeBoard();
    
    // Event listener per input
    document.getElementById('roomCodeInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    // Inizializza UI
    updateUI();
    
    // Crea stile per animazione
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(style);
});
