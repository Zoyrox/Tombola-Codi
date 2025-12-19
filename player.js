// player.js - PERCORSI RELATIVI

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    const playerName = decodeURIComponent(urlParams.get('player') || 'Giocatore');
    
    if (!roomCode) {
        window.location.href = 'index.html'; // Percorso relativo
        return;
    }
    
    // Imposta info giocatore
    document.getElementById('roomCode').textContent = roomCode;
    const playerNameElement = document.getElementById('playerName');
    if (playerNameElement) {
        playerNameElement.textContent = playerName;
    }
    
    // Connessione Socket.io (percorso relativo)
    const socket = io('http://localhost:3000');
    socket.emit('join-room', { roomCode, playerName });
    
    // Stato del giocatore
    const playerState = {
        cards: [],
        markedNumbers: new Set()
    };
    
    // Inizializza la pagina
    initializePlayerCards();
    initializeBoard();
    setupEventListeners();
    
    // ========== SOCKET EVENT HANDLERS ==========
    
    // Ricevi conferma connessione
    socket.on('room-joined', (data) => {
        console.log('Connesso alla stanza:', data.roomCode);
        
        // Aggiorna numeri già estratti
        if (data.extractedNumbers && data.extractedNumbers.length > 0) {
            updateBoard(data.extractedNumbers);
            const countElement = document.getElementById('extractedCount');
            if (countElement) {
                countElement.textContent = data.extractedNumbers.length;
            }
            
            // Controlla i numeri sulle cartelle
            data.extractedNumbers.forEach(num => {
                checkPlayerCards(num);
            });
        }
        
        if (data.lastNumber) {
            const currentNumElement = document.getElementById('currentNumber');
            if (currentNumElement) {
                currentNumElement.textContent = data.lastNumber;
            }
        }
    });
    
    // Nuovo numero estratto
    socket.on('number-extracted', (data) => {
        console.log('Numero estratto:', data.number);
        
        // Aggiorna UI
        const currentNumElement = document.getElementById('currentNumber');
        const countElement = document.getElementById('extractedCount');
        if (currentNumElement) currentNumElement.textContent = data.number;
        if (countElement) countElement.textContent = data.totalExtracted;
        
        // Aggiorna tabellone e cartelle
        updateBoard(data.extractedNumbers);
        checkPlayerCards(data.number);
    });
    
    // Stanza chiusa dall'admin
    socket.on('room-closed', () => {
        alert('L\'admin ha chiuso la stanza.');
        window.location.href = 'index.html';
    });
    
    // ========== FUNZIONI ==========
    
    function initializePlayerCards() {
        const container = document.getElementById('playerCards');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Genera 3 cartelle casuali
        for (let cardNum = 0; cardNum < 3; cardNum++) {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.innerHTML = `
                <div class="card-header">
                    <h4>🎴 Cartella ${cardNum + 1}</h4>
                    <span class="card-stats" id="stats-${cardNum}">0/15</span>
                </div>
                <div class="card-grid" id="card-grid-${cardNum}"></div>
            `;
            container.appendChild(card);
            
            // Genera numeri per questa cartella
            const cardNumbers = generateCardNumbers();
            playerState.cards[cardNum] = cardNumbers;
            
            // Popola la griglia
            const grid = document.getElementById(`card-grid-${cardNum}`);
            if (grid) {
                // Implementa qui la logica per popolare la griglia
                // Esempio: cardNumbers.forEach(num => { ... })
            }
        }
    }
    
    function generateCardNumbers() {
        // Implementa la logica di generazione delle cartelle
        return []; // Placeholder
    }
    
    function checkPlayerCards(number) {
        // Implementa la logica per segnare i numeri sulle cartelle
        playerState.markedNumbers.add(number);
        // Aggiorna UI delle cartelle
    }
    
    function initializeBoard() {
        const board = document.getElementById('board');
        if (!board) return;
        
        board.innerHTML = '';
        
        for (let i = 1; i <= 90; i++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = i;
            cell.id = `board-cell-${i}`;
            board.appendChild(cell);
        }
    }
    
    function updateBoard(extractedNumbers) {
        extractedNumbers.forEach(num => {
            const cell = document.getElementById(`board-cell-${num}`);
            if (cell) {
                cell.classList.add('extracted');
            }
        });
    }
    
    function setupEventListeners() {
        const tombolaBtn = document.getElementById('tombolaBtn');
        const amicoBtn = document.getElementById('amicoBtn');
        
        if (tombolaBtn) {
            tombolaBtn.addEventListener('click', () => {
                if (confirm('Vuoi chiamare TOMBOLA?')) {
                    socket.emit('call-tombola', { roomCode, playerName });
                }
            });
        }
        
        if (amicoBtn) {
            amicoBtn.addEventListener('click', () => {
                alert('Ambo chiamato!');
            });
        }
    }
});