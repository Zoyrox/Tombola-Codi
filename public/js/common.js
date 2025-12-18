// admin.js - Pannello Amministratore

let extractedNumbers = [];
let currentExtractedNumber = null;
let players = [];
let roomCode = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza tabellone
    initTombolaBoard();
    
    // Setup event listeners
    document.getElementById('createBtn').addEventListener('click', createRoom);
    document.getElementById('joinBtn').addEventListener('click', joinRoom);
    document.getElementById('extractBtn').addEventListener('click', extractNumber);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    
    // Socket events
    socket.on('room-created', (data) => {
        roomCode = data.roomCode;
        showNotification(data.message, 'success');
        showGamePanel();
        updateRoomDisplay();
    });
    
    socket.on('players-updated', (data) => {
        players = data.players;
        updatePlayersDisplay();
        document.getElementById('playerCount').textContent = data.playerCount;
    });
    
    socket.on('player-joined', (data) => {
        showNotification(`${data.playerName} si è unito alla partita!`, 'success');
        document.getElementById('playerCount').textContent = data.playerCount;
    });
    
    socket.on('player-left', (data) => {
        showNotification(`${data.playerName} ha lasciato la partita`, 'info');
        document.getElementById('playerCount').textContent = data.playerCount;
    });
    
    socket.on('winner', (data) => {
        showNotification(data.message, 'success');
        updateWinnersDisplay(data.type, data.playerName);
    });
});

// Crea nuova stanza
function createRoom() {
    if (!socket || !socket.connected) {
        showNotification('Non connesso al server', 'error');
        return;
    }
    
    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREAZIONE...';
    
    socket.emit('create-room');
}

// Entra in stanza esistente (per admin)
function joinRoom() {
    const roomCodeInput = document.getElementById('roomCodeInput').value.toUpperCase().trim();
    
    if (!roomCodeInput || roomCodeInput.length !== 6) {
        showNotification('Inserisci un codice stanza valido (6 caratteri)', 'error');
        return;
    }
    
    // Per admin, join è solo per prendere controllo stanza esistente
    // In una versione reale, servirebbe autenticazione admin
    roomCode = roomCodeInput;
    showGamePanel();
    updateRoomDisplay();
    
    showNotification(`Controllo stanza ${roomCode} preso`, 'success');
}

// Mostra pannello gioco
function showGamePanel() {
    document.getElementById('setupRoom').style.display = 'none';
    document.getElementById('gamePanel').style.display = 'block';
}

// Aggiorna display stanza
function updateRoomDisplay() {
    if (!roomCode) return;
    
    document.getElementById('roomCodeDisplay').textContent = generateVisualCode(roomCode);
    
    // Aggiorna URL condivisione
    const shareUrl = `${window.location.origin}/player?room=${roomCode}`;
    document.getElementById('shareUrl').textContent = shareUrl;
    document.getElementById('shareUrl').href = shareUrl;
}

// Inizializza tabellone tombola
function initTombolaBoard() {
    const board = document.getElementById('tombolaBoard');
    if (!board) return;
    
    board.innerHTML = '';
    
    // Crea 90 numeri (1-90)
    for (let i = 1; i <= 90; i++) {
        const numberDiv = document.createElement('div');
        numberDiv.className = 'board-number';
        numberDiv.textContent = i;
        numberDiv.dataset.number = i;
        board.appendChild(numberDiv);
    }
}

// Estrai numero
function extractNumber() {
    if (!socket || !socket.connected || !roomCode) {
        showNotification('Non connesso alla stanza', 'error');
        return;
    }
    
    if (extractedNumbers.length >= 90) {
        showNotification('Tutti i numeri sono stati estratti!', 'warning');
        return;
    }
    
    const extractBtn = document.getElementById('extractBtn');
    extractBtn.disabled = true;
    extractBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ESTRAZIONE...';
    
    socket.emit('extract-number');
    
    // Ricevi numero estratto
    socket.once('number-extracted', (data) => {
        handleExtractedNumber(data.number, true);
        extractBtn.disabled = false;
        extractBtn.innerHTML = '<i class="fas fa-star"></i> ESTRANI NUMERO';
    });
}

// Gestisci numero estratto
function handleExtractedNumber(number, isNew = false) {
    if (extractedNumbers.includes(number)) return;
    
    extractedNumbers.push(number);
    currentExtractedNumber = number;
    
    // Aggiorna display numero corrente
    const currentDisplay = document.getElementById('currentNumberDisplay');
    currentDisplay.textContent = number;
    
    // Animazione per nuovo numero
    if (isNew) {
        currentDisplay.style.animation = 'flash-gold 0.5s ease-in-out infinite';
        
        // Rimuovi animazione dopo 5 secondi
        setTimeout(() => {
            currentDisplay.style.animation = 'pulse 2s infinite';
        }, 5000);
    }
    
    // Aggiorna tabellone
    updateBoardNumber(number, isNew);
    
    // Aggiorna lista numeri estratti
    updateExtractedNumbersList();
    
    // Aggiorna contatori
    document.getElementById('extractedCount').textContent = extractedNumbers.length;
    document.getElementById('totalExtracted').textContent = extractedNumbers.length;
    
    showNotification(`Numero estratto: ${number}`, 'success');
}

// Aggiorna numero sul tabellone
function updateBoardNumber(number, isCurrent = false) {
    const numberElement = document.querySelector(`.board-number[data-number="${number}"]`);
    if (!numberElement) return;
    
    // Rimuovi classe "current" da tutti i numeri
    document.querySelectorAll('.board-number.current').forEach(el => {
        el.classList.remove('current');
        el.classList.add('extracted');
    });
    
    // Aggiorna il numero corrente
    numberElement.classList.add('extracted');
    if (isCurrent) {
        numberElement.classList.add('current');
    }
}

// Aggiorna lista numeri estratti
function updateExtractedNumbersList() {
    const list = document.getElementById('extractedNumbersList');
    if (!list) return;
    
    // Mostra solo gli ultimi 20 numeri
    const recentNumbers = extractedNumbers.slice(-20);
    list.innerHTML = '';
    
    recentNumbers.forEach(number => {
        const numberDiv = document.createElement('div');
        numberDiv.className = 'extracted-number';
        numberDiv.textContent = number;
        list.appendChild(numberDiv);
    });
}

// Aggiorna display giocatori
function updatePlayersDisplay() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    if (players.length === 0) {
        playersList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; opacity: 0.7;">
                <i class="fas fa-user-friends" style="font-size: 3rem; margin-bottom: 10px; display: block;"></i>
                <p>Nessun giocatore ancora...</p>
                <p style="font-size: 0.9rem;">Condividi il codice stanza per invitare giocatori</p>
            </div>
        `;
        return;
    }
    
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <div style="font-weight: bold; color: #ffd700; margin-bottom: 5px;">${player.name}</div>
            <div style="font-size: 0.9rem; opacity: 0.8;">Vittorie: ${player.wins}</div>
        `;
        playersList.appendChild(playerCard);
    });
}

// Aggiorna display vincitori
function updateWinnersDisplay(type, playerName) {
    const winnerListId = `${type}Winners`;
    const winnerList = document.getElementById(winnerListId);
    
    if (!winnerList) return;
    
    // Rimuovi placeholder se presente
    if (winnerList.querySelector('.placeholder')) {
        winnerList.innerHTML = '';
    }
    
    const winnerItem = document.createElement('div');
    winnerItem.className = 'winner-item';
    winnerItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${playerName}</span>
            <span style="font-size: 0.9rem; opacity: 0.8;">${new Date().toLocaleTimeString()}</span>
        </div>
    `;
    
    winnerList.prepend(winnerItem);
}

// Resetta partita
function resetGame() {
    if (!socket || !socket.connected || !roomCode) {
        showNotification('Non connesso alla stanza', 'error');
        return;
    }
    
    if (!confirm('Sei sicuro di voler resettare la partita? Tutti i numeri estratti verranno cancellati.')) {
        return;
    }
    
    socket.emit('reset-game');
    
    // Ricevi conferma reset
    socket.once('game-reset', () => {
        extractedNumbers = [];
        currentExtractedNumber = null;
        
        // Reset display
        document.getElementById('currentNumberDisplay').textContent = '--';
        document.getElementById('extractedCount').textContent = '0';
        document.getElementById('totalExtracted').textContent = '0';
        document.getElementById('extractedNumbersList').innerHTML = '';
        
        // Reset tabellone
        document.querySelectorAll('.board-number').forEach(el => {
            el.classList.remove('extracted', 'current');
        });
        
        // Reset liste vincitori
        ['ambo', 'terno', 'quaterna', 'cinquina'].forEach(type => {
            const list = document.getElementById(`${type}Winners`);
            if (list) {
                list.innerHTML = `
                    <div style="opacity: 0.7; text-align: center; padding: 20px;" class="placeholder">
                        Nessun vincitore
                    </div>
                `;
            }
        });
        
        showNotification('Partita resettata con successo!', 'success');
    });
}

// Copia link condivisione
function copyShareLink() {
    const shareUrl = document.getElementById('shareUrl').textContent;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Link copiato negli appunti!', 'success');
    }).catch(err => {
        showNotification('Errore nella copia del link', 'error');
    });
}
