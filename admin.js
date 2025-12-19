// admin.js - PERCORSI RELATIVI PER EVENTUALI IMPORT

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (!roomCode) {
        window.location.href = 'index.html'; // Percorso relativo
        return;
    }
    
    document.getElementById('roomCode').textContent = roomCode;
    
    // Connessione al server (percorso relativo alla stessa origine)
    const socket = io('http://localhost:3000');
    socket.emit('join-room', { roomCode, playerName: 'ADMIN' });
    
    // Inizializza tabellone
    initializeBoard();
    
    // Estrai numero
    document.getElementById('extractBtn').addEventListener('click', () => {
        socket.emit('extract-number', roomCode);
    });
    
    // Reset partita
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('Vuoi resettare tutta la partita?')) {
            socket.emit('reset-game', roomCode);
        }
    });
    
    // Aggiorna numeri estratti
    socket.on('number-extracted', (data) => {
        document.getElementById('lastNumber').textContent = data.number;
        document.getElementById('extractedCount').textContent = data.totalExtracted;
        updateBoard(data.extractedNumbers);
    });
    
    // Aggiorna lista giocatori
    socket.on('player-joined', (data) => {
        updatePlayersList(data);
    });
    
    socket.on('player-left', (data) => {
        updatePlayersList(data);
    });
    
    // Giocatore chiama Tombola
    socket.on('tombola-called', (data) => {
        alert(`🎉 ${data.playerName} ha chiamato TOMBOLA alle ${data.timestamp}!`);
    });
});

function initializeBoard() {
    const board = document.getElementById('board');
    if (!board) return;
    
    board.innerHTML = '';
    
    for (let i = 1; i <= 90; i++) {
        const cell = document.createElement('div');
        cell.className = 'number-cell';
        cell.textContent = i;
        cell.id = `cell-${i}`;
        board.appendChild(cell);
    }
}

function updateBoard(extractedNumbers) {
    extractedNumbers.forEach(num => {
        const cell = document.getElementById(`cell-${num}`);
        if (cell) {
            cell.classList.add('extracted');
        }
    });
}

function updatePlayersList(data) {
    const list = document.getElementById('playersList');
    const count = document.getElementById('playerCount');
    
    if (count) {
        count.textContent = data.totalPlayers || 0;
    }
}

// Funzione globale per copiare il link della stanza
function copyRoomLink() {
    const link = `${window.location.origin}/index.html?join=${document.getElementById('roomCode').textContent}`;
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copiato! Inviarlo agli amici.');
    });
}