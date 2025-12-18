const socket = io();
let currentRoom = null;
let playerName = '';
let playerCard = [];
let markedNumbers = [];
let gameState = {
    extractedNumbers: [],
    currentNumber: null,
    isGameStarted: false,
    players: {},
    winners: {
        ambo: [],
        terno: [],
        quaterna: [],
        cinquina: []
    }
};

// Elementi DOM
const playerSetup = document.getElementById('playerSetup');
const playerPanel = document.getElementById('playerPanel');
const roomCodeInput = document.getElementById('roomCode');
const playerNameInput = document.getElementById('playerName');
const enterRoomBtn = document.getElementById('enterRoomBtn');
const quickJoinBtn = document.getElementById('quickJoinBtn');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const roomInfoDisplay = document.getElementById('roomInfoDisplay');
const playerCountElement = document.getElementById('playerCount');
const extractedCountElement = document.getElementById('extractedCount');
const myWinsCountElement = document.getElementById('myWinsCount');
const currentNumberElement = document.getElementById('currentNumber');
const markedCountElement = document.getElementById('markedCount');
const completeRowsElement = document.getElementById('completeRows');
const tombolaStatusElement = document.getElementById('tombolaStatus');
const playerCardElement = document.getElementById('playerCard');
const extractedNumbersElement = document.getElementById('extractedNumbers');
const myWinsElement = document.getElementById('myWins');
const winnersList = document.getElementById('winnersList');
const amboWinnersList = document.getElementById('amboWinnersList');
const ternoSinnersList = document.getElementById('ternoSinnersList');
const quaternaWinnersList = document.getElementById('quaternaWinnersList');
const cinquinaWinnersList = document.getElementById('cinquinaWinnersList');
const totalWinners = document.getElementById('totalWinners');
const lastWinner = document.getElementById('lastWinner');
const mostWins = document.getElementById('mostWins');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const soundToggle = document.getElementById('soundToggle');
const autoMarkBtn = document.getElementById('autoMarkBtn');
const checkCardBtn = document.getElementById('checkCardBtn');
const gameStatusInfo = document.getElementById('gameStatusInfo');
const connectionStatus = document.getElementById('connectionStatus');
const chatMessages = document.getElementById('chatMessages');
const lastNumberTime = document.getElementById('lastNumberTime');
const extractionFrequency = document.getElementById('extractionFrequency');

let soundEnabled = true;
let autoMarkEnabled = false;
let lastExtractionTime = null;
let extractionTimes = [];

// Entra in stanza
enterRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    playerName = playerNameInput.value.trim();
    
    if (!roomCode || roomCode.length !== 6) {
        showNotification('Inserisci un codice stanza valido di 6 caratteri', 'error');
        return;
    }
    
    if (!playerName || playerName.length < 2) {
        showNotification('Inserisci un nome di almeno 2 caratteri', 'error');
        return;
    }
    
    if (playerName.length > 20) {
        showNotification('Il nome non può superare 20 caratteri', 'error');
        return;
    }
    
    socket.emit('player-join', { roomCode, playerName });
});

// Unisciti velocemente con nome casuale
quickJoinBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!roomCode || roomCode.length !== 6) {
        showNotification('Inserisci un codice stanza valido di 6 caratteri', 'error');
        return;
    }
    
    // Genera nome casuale natalizio
    const christmasNames = [
        "Babbo Natale", "Elfo Birillo", "Renna Rudolph", "Elfo Giocoso", 
        "Folletto Natalizio", "Orso Polare", "Pinguino", "Spirito Natalizio",
        "Stella Cometa", "Angelo Custode", "Re Magio", "Pastorello",
        "Grinch", "Elfo Laborioso", "Bambino Gesù", "Regina Neve"
    ];
    const randomName = christmasNames[Math.floor(Math.random() * christmasNames.length)];
    
    playerNameInput.value = randomName;
    playerName = randomName;
    
    socket.emit('player-join', { roomCode, playerName });
});

// Permetti Enter per entrare
roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enterRoomBtn.click();
});
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enterRoomBtn.click();
});

// Lascia stanza
leaveRoomBtn.addEventListener('click', () => {
    if (currentRoom) {
        if (confirm('Sei sicuro di voler lasciare la stanza?')) {
            socket.emit('leave-room', currentRoom);
            resetToSetup();
            showNotification('Hai lasciato la stanza', 'info');
        }
    }
});

// Toggle suoni
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.innerHTML = soundEnabled ? 
        '<i class="fas fa-volume-up"></i>' : 
        '<i class="fas fa-volume-mute"></i>';
    soundToggle.classList.toggle('active', soundEnabled);
    showNotification(soundEnabled ? 'Suoni attivati' : 'Suoni disattivati', 'info');
    
    // Salva preferenza in localStorage
    localStorage.setItem('tombolaSoundEnabled', soundEnabled);
});

// Auto-segna
autoMarkBtn.addEventListener('click', () => {
    autoMarkEnabled = !autoMarkEnabled;
    autoMarkBtn.classList.toggle('active', autoMarkEnabled);
    autoMarkBtn.innerHTML = autoMarkEnabled ? 
        '<i class="fas fa-robot"></i> Auto-segna ON' : 
        '<i class="fas fa-robot"></i> Auto-segna';
    showNotification(autoMarkEnabled ? 'Auto-segna attivato' : 'Auto-segna disattivato', 'info');
    
    // Se attivato, segna tutti i numeri estratti
    if (autoMarkEnabled) {
        autoMarkExtractedNumbers();
    }
    
    // Salva preferenza in localStorage
    localStorage.setItem('tombolaAutoMark', autoMarkEnabled);
});

// Controlla cartella
checkCardBtn.addEventListener('click', () => {
    const missedNumbers = getMissedNumbers();
    if (missedNumbers.length > 0) {
        showNotification(`Hai perso ${missedNumbers.length} numeri estratti! Controlla: ${missedNumbers.join(', ')}`, 'warning');
        highlightMissedNumbers(missedNumbers);
    } else {
        showNotification('Perfetto! Tutti i numeri estratti sono segnati!', 'success');
    }
});

// Genera cartella visuale
function generateCardDisplay(card) {
    playerCardElement.innerHTML = '';
    
    for (let row = 0; row < 3; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'card-row';
        
        for (let col = 0; col < 9; col++) {
            const number = card[row][col];
            const numberElement = document.createElement('div');
            
            if (number !== null) {
                numberElement.className = 'card-number';
                numberElement.textContent = number;
                numberElement.dataset.number = number;
                numberElement.dataset.row = row;
                numberElement.dataset.col = col;
                
                // Aggiungi tooltip con posizione
                numberElement.title = `Riga ${row + 1}, Colonna ${col + 1}`;
                
                if (markedNumbers.includes(number)) {
                    numberElement.classList.add('marked');
                    
                    // Controlla se è una vittoria
                    const winType = getWinTypeForNumber(number);
                    if (winType) {
                        numberElement.classList.add('winning');
                        numberElement.title += ` - ${winType}!`;
                    }
                }
                
                if (gameState.currentNumber === number) {
                    numberElement.classList.add('just-called');
                    setTimeout(() => {
                        numberElement.classList.remove('just-called');
                    }, 2000);
                }
                
                numberElement.addEventListener('click', () => {
                    toggleNumberMark(number);
                });
                
                // Aggiungi effetto hover
                numberElement.addEventListener('mouseenter', () => {
                    if (!numberElement.classList.contains('marked')) {
                        numberElement.style.transform = 'scale(1.05)';
                        numberElement.style.boxShadow = '0 5px 15px rgba(218, 165, 32, 0.3)';
                    }
                });
                
                numberElement.addEventListener('mouseleave', () => {
                    if (!numberElement.classList.contains('marked')) {
                        numberElement.style.transform = '';
                        numberElement.style.boxShadow = '';
                    }
                });
            } else {
                numberElement.className = 'card-number null';
                numberElement.innerHTML = '&nbsp;';
            }
            
            rowElement.appendChild(numberElement);
        }
        
        playerCardElement.appendChild(rowElement);
    }
    
    updateCardStats();
}

// Ottieni tipo di vittoria per numero
function getWinTypeForNumber(number) {
    const playerData = gameState.players?.[socket.id];
    if (!playerData?.wins) return null;
    
    // Trova a quale riga appartiene il numero
    for (let row = 0; row < 3; row++) {
        if (playerCard[row].includes(number)) {
            const rowNumbers = playerCard[row].filter(n => n !== null);
            const markedInRow = rowNumbers.filter(n => markedNumbers.includes(n));
            
            if (markedInRow.length >= 5) return 'Cinquina';
            if (markedInRow.length >= 4) return 'Quaterna';
            if (markedInRow.length >= 3) return 'Terno';
            if (markedInRow.length >= 2) return 'Ambo';
        }
    }
    return null;
}

// Segna/smarca numero
function toggleNumberMark(number) {
    if (!gameState.extractedNumbers.includes(number)) {
        showNotification('Questo numero non è stato ancora estratto!', 'warning');
        return;
    }
    
    const element = document.querySelector(`.card-number[data-number="${number}"]`);
    
    if (markedNumbers.includes(number)) {
        // Smarca
        markedNumbers = markedNumbers.filter(n => n !== number);
        element.classList.remove('marked', 'winning');
        showNotification(`Numero ${number} smarcato`, 'info');
    } else {
        // Segna
        markedNumbers.push(number);
        element.classList.add('marked');
        playMarkSound();
        
        // Controlla se è una vittoria
        checkWins();
    }
    
    socket.emit('mark-number', { roomCode: currentRoom, number });
    updateCardStats();
}

// Aggiorna visuale cartella
function updateCardDisplay() {
    document.querySelectorAll('.card-number:not(.null)').forEach(element => {
        const number = parseInt(element.dataset.number);
        
        // Aggiorna stato segnato
        if (markedNumbers.includes(number)) {
            element.classList.add('marked');
            
            // Aggiorna vittorie
            const winType = getWinTypeForNumber(number);
            if (winType && !element.classList.contains('winning')) {
                element.classList.add('winning');
            }
        } else {
            element.classList.remove('marked', 'winning');
        }
        
        // Aggiorna numero corrente
        if (gameState.currentNumber === number) {
            element.classList.add('just-called');
            setTimeout(() => {
                element.classList.remove('just-called');
            }, 2000);
        }
    });
    
    updateCardStats();
}

// Statistiche cartella
function updateCardStats() {
    const markedCount = markedNumbers.length;
    markedCountElement.textContent = markedCount;
    
    // Controlla righe complete e progressi
    let completeRows = 0;
    let rowProgress = [0, 0, 0];
    
    for (let row = 0; row < 3; row++) {
        const rowNumbers = playerCard[row].filter(n => n !== null);
        const markedInRow = rowNumbers.filter(n => markedNumbers.includes(n));
        rowProgress[row] = markedInRow.length;
        
        if (markedInRow.length === rowNumbers.length) {
            completeRows++;
        }
    }
    
    completeRowsElement.textContent = `${completeRows}/3`;
    
    // Controlla Tombola (tutti i numeri segnati)
    const totalNumbers = playerCard.flat().filter(n => n !== null).length;
    const hasTombola = markedCount === totalNumbers;
    tombolaStatusElement.textContent = hasTombola ? 'SÌ!' : 'No';
    tombolaStatusElement.style.color = hasTombola ? 'var(--christmas-gold)' : 'var(--snow-white)';
    
    if (hasTombola && !window.tombolaNotified) {
        window.tombolaNotified = true;
        showNotification('🎉 TOMBOLA! Hai completato tutta la cartella! 🎉', 'success');
        playTombolaSound();
        
        // Effetto speciale per Tombola
        document.querySelectorAll('.card-number.marked').forEach(el => {
            el.style.animation = 'glow 1s infinite alternate';
        });
    }
    
    // Aggiorna progress bar
    updateProgressBars(rowProgress);
}

// Aggiorna progress bar
function updateProgressBars(rowProgress) {
    // Trova la riga con più progresso
    const maxProgress = Math.max(...rowProgress);
    
    ['ambo', 'terno', 'quaterna', 'cinquina'].forEach((type, index) => {
        const needed = index + 2; // 2, 3, 4, 5
        const progress = Math.min((maxProgress / needed) * 100, 100);
        const progressBar = document.querySelector(`.${type}-progress`);
        const progressValue = document.querySelectorAll('.progress-value')[index];
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.style.backgroundColor = progress === 100 ? 
                type === 'cinquina' ? '#9b59b6' : 
                type === 'quaterna' ? '#ff6b6b' :
                type === 'terno' ? '#ffd700' : '#4cd964' : 
                'currentColor';
        }
        
        if (progressValue) {
            progressValue.textContent = `${maxProgress}/${needed}`;
            progressValue.style.color = progress === 100 ? 
                type === 'cinquina' ? '#9b59b6' : 
                type === 'quaterna' ? '#ff6b6b' :
                type === 'terno' ? '#ffd700' : '#4cd964' : 
                'var(--snow-white)';
        }
    });
}

// Numeri persi
function getMissedNumbers() {
    return gameState.extractedNumbers.filter(num => 
        playerCard.flat().includes(num) && !markedNumbers.includes(num)
    );
}

// Evidenzia numeri persi
function highlightMissedNumbers(missedNumbers) {
    missedNumbers.forEach(num => {
        const element = document.querySelector(`.card-number[data-number="${num}"]`);
        if (element) {
            element.style.animation = 'pulse 0.5s 3';
            element.style.border = '2px solid var(--holly-red)';
            
            setTimeout(() => {
                element.style.animation = '';
                element.style.border = '';
            }, 1500);
        }
    });
}

// Aggiorna numeri estratti
function updateExtractedNumbers(numbers) {
    extractedNumbersElement.innerHTML = '';
    
    if (numbers.length === 0) {
        extractedNumbersElement.innerHTML = `
            <div class="empty-numbers">
                <i class="fas fa-dice"></i>
                <p>Nessun numero estratto</p>
            </div>
        `;
    } else {
        numbers.forEach(num => {
            const numberElement = document.createElement('div');
            numberElement.className = 'extracted-number';
            numberElement.textContent = num;
            
            // Evidenzia se è nella cartella
            if (playerCard.flat().includes(num)) {
                numberElement.style.border = '2px solid var(--christmas-gold)';
                numberElement.style.boxShadow = '0 0 10px rgba(218, 165, 32, 0.3)';
                
                if (markedNumbers.includes(num)) {
                    numberElement.style.background = 'linear-gradient(45deg, var(--christmas-green), #4cd964)';
                    numberElement.title = 'Già segnato sulla tua cartella';
                } else {
                    numberElement.style.background = 'linear-gradient(45deg, var(--christmas-red), #ff6b6b)';
                    numberElement.title = 'Presente sulla tua cartella - segnalo!';
                    numberElement.style.cursor = 'pointer';
                    numberElement.addEventListener('click', () => toggleNumberMark(num));
                }
            } else {
                numberElement.title = 'Non presente sulla tua cartella';
            }
            
            extractedNumbersElement.appendChild(numberElement);
        });
        
        // Scorri all'ultimo numero
        extractedNumbersElement.scrollTop = extractedNumbersElement.scrollHeight;
    }
    
    extractedCountElement.textContent = numbers.length;
    
    // Aggiorna tempo ultima estrazione
    if (numbers.length > 0) {
        const now = new Date();
        lastExtractionTime = now;
        extractionTimes.push(now);
        
        // Mantieni solo ultimi 10 tempi
        if (extractionTimes.length > 10) {
            extractionTimes.shift();
        }
        
        // Calcola frequenza
        if (extractionTimes.length > 1) {
            const totalTime = extractionTimes[extractionTimes.length - 1] - extractionTimes[0];
            const avgTime = totalTime / (extractionTimes.length - 1);
            extractionFrequency.textContent = `${Math.round(avgTime / 1000)}s`;
        }
        
        lastNumberTime.textContent = now.toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// Aggiorna mie vittorie
function updateMyWins() {
    const playerData = gameState.players?.[socket.id];
    const wins = playerData?.wins || [];
    
    myWinsElement.innerHTML = '';
    myWinsCountElement.textContent = wins.length;
    
    if (wins.length === 0) {
        myWinsElement.innerHTML = `
            <div class="empty-wins">
                <i class="fas fa-star"></i>
                <p>Nessuna vittoria ancora</p>
                <p class="small">Segna i numeri per vincere!</p>
            </div>
        `;
    } else {
        // Raggruppa vittorie per tipo
        const winCounts = {
            ambo: 0,
            terno: 0,
            quaterna: 0,
            cinquina: 0
        };
        
        wins.forEach(win => {
            if (winCounts[win] !== undefined) {
                winCounts[win]++;
            }
        });
        
        // Crea elementi per ogni tipo di vittoria
        Object.entries(winCounts).forEach(([type, count]) => {
            if (count > 0) {
                const winElement = document.createElement('div');
                winElement.className = 'win-item';
                
                const winIcons = {
                    'ambo': { icon: 'fa-2', color: '#4cd964' },
                    'terno': { icon: 'fa-3', color: '#ffd700' },
                    'quaterna': { icon: 'fa-4', color: '#ff6b6b' },
                    'cinquina': { icon: 'fa-5', color: '#9b59b6' }
                };
                
                winElement.innerHTML = `
                    <div class="win-icon" style="background: linear-gradient(45deg, ${winIcons[type].color}, ${winIcons[type].color}80)">
                        <i class="fas ${winIcons[type].icon}"></i>
                    </div>
                    <div class="win-details">
                        <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
                        <p>Vinto ${count} ${count === 1 ? 'volta' : 'volte'}</p>
                    </div>
                `;
                myWinsElement.appendChild(winElement);
            }
        });
    }
}

// Aggiorna lista vincitori
function updateWinnersList() {
    const allWinners = [
        ...gameState.winners.ambo,
        ...gameState.winners.terno,
        ...gameState.winners.quaterna,
        ...gameState.winners.cinquina
    ];
    
    // Aggiorna totale vincitori
    totalWinners.textContent = allWinners.length;
    
    // Ultimo vincitore
    if (allWinners.length > 0) {
        const last = allWinners[allWinners.length - 1];
        const time = last.timestamp ? new Date(last.timestamp).toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : 'ora';
        lastWinner.textContent = `${last.name} (${time})`;
    } else {
        lastWinner.textContent = '--';
    }
    
    // Giocatore con più vittorie
    const winCounts = {};
    allWinners.forEach(winner => {
        winCounts[winner.name] = (winCounts[winner.name] || 0) + 1;
    });
    
    const mostWinsPlayer = Object.entries(winCounts).reduce((a, b) => 
        a[1] > b[1] ? a : b, ['', 0]
    );
    
    mostWins.textContent = mostWinsPlayer[1] > 0 ? 
        `${mostWinsPlayer[0]} (${mostWinsPlayer[1]} vittorie)` : '--';
    
    // Aggiorna tutte le liste
    updateWinnerCategoryList(winnersList, allWinners, 'Tutti');
    updateWinnerCategoryList(amboWinnersList, gameState.winners.ambo, 'Ambo');
    updateWinnerCategoryList(ternoSinnersList, gameState.winners.terno, 'Terno');
    updateWinnerCategoryList(quaternaWinnersList, gameState.winners.quaterna, 'Quaterna');
    updateWinnerCategoryList(cinquinaWinnersList, gameState.winners.cinquina, 'Cinquina');
}

function updateWinnerCategoryList(element, winners, type) {
    element.innerHTML = '';
    
    if (winners.length === 0) {
        element.innerHTML = `
            <div class="empty-winner">
                <i class="fas fa-trophy"></i>
                <p>Nessun ${type.toLowerCase()} ancora</p>
            </div>
        `;
        return;
    }
    
    // Ordina per timestamp (più recente prima)
    const sortedWinners = [...winners].sort((a, b) => 
        new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
    );
    
    sortedWinners.forEach(winner => {
        const winnerElement = document.createElement('div');
        winnerElement.className = 'winner-item';
        const isMe = winner.id === socket.id;
        
        const time = winner.timestamp ? new Date(winner.timestamp).toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        }) : '--:--';
        
        winnerElement.innerHTML = `
            <div class="winner-avatar" style="background: ${isMe ? 
                'linear-gradient(45deg, var(--christmas-gold), #ffd700)' : 
                'linear-gradient(45deg, var(--christmas-red), var(--christmas-green))'}">
                <i class="fas ${isMe ? 'fa-user' : 'fa-trophy'}"></i>
            </div>
            <div class="winner-details">
                <div class="winner-name" style="color: ${isMe ? 'var(--christmas-gold)' : 'var(--snow-white)'}; font-weight: ${isMe ? 'bold' : 'normal'}">
                    ${winner.name} ${isMe ? '<span style="font-size: 0.8em">(Tu!)</span>' : ''}
                </div>
                <div class="winner-time" style="color: ${isMe ? 'rgba(218, 165, 32, 0.8)' : 'rgba(255, 255, 255, 0.7)'}">
                    ${time}
                </div>
            </div>
        `;
        element.appendChild(winnerElement);
    });
}

// Controlla vittorie
function checkWins() {
    // La logica di vincita è gestita principalmente dal server
    // Questa funzione serve solo per effetti visivi locali
    
    for (let row = 0; row < 3; row++) {
        const rowNumbers = playerCard[row].filter(n => n !== null);
        const markedInRow = rowNumbers.filter(n => markedNumbers.includes(n));
        
        // Evidenzia le vittorie localmente
        if (markedInRow.length >= 2) {
            rowNumbers.forEach(num => {
                if (markedNumbers.includes(num)) {
                    const element = document.querySelector(`.card-number[data-number="${num}"]`);
                    if (element && !element.classList.contains('winning')) {
                        // Il server si occuperà di notificare la vittoria effettiva
                    }
                }
            });
        }
    }
}

// Auto-segna numeri estratti
function autoMarkExtractedNumbers() {
    if (!autoMarkEnabled) return;
    
    let newMarks = 0;
    gameState.extractedNumbers.forEach(num => {
        if (playerCard.flat().includes(num) && !markedNumbers.includes(num)) {
            markedNumbers.push(num);
            socket.emit('mark-number', { roomCode: currentRoom, number: num });
            newMarks++;
        }
    });
    
    if (newMarks > 0) {
        updateCardDisplay();
        checkWins();
        showNotification(`Auto-segna: segnati ${newMarks} nuovi numeri`, 'info');
    }
}

// Aggiorna UI completa
function updateUI() {
    generateCardDisplay(playerCard);
    updateExtractedNumbers(gameState.extractedNumbers);
    updateMyWins();
    updateWinnersList();
    
    if (gameState.currentNumber) {
        currentNumberElement.textContent = gameState.currentNumber;
        
        // Effetto speciale per nuovo numero
        currentNumberElement.style.animation = 'numberGlow 2s ease-in-out';
        setTimeout(() => {
            currentNumberElement.style.animation = '';
        }, 2000);
    } else {
        currentNumberElement.textContent = '--';
    }
    
    playerCountElement.textContent = Object.keys(gameState.players || {}).length;
    
    if (gameState.isGameStarted) {
        gameStatusInfo.textContent = '🎮 Partita in corso';
        gameStatusInfo.style.color = 'var(--christmas-green)';
        gameStatusInfo.style.fontWeight = 'bold';
    } else {
        gameStatusInfo.textContent = '⏳ In attesa che il master inizi il gioco';
        gameStatusInfo.style.color = 'var(--christmas-gold)';
    }
    
    // Aggiorna stato connessione
    connectionStatus.textContent = socket.connected ? 'Connesso' : 'Disconnesso';
    connectionStatus.style.color = socket.connected ? '#4cd964' : '#ff6b6b';
    
    // Auto-segna se attivo
    if (autoMarkEnabled) {
        autoMarkExtractedNumbers();
    }
}

// Reset a setup
function resetToSetup() {
    currentRoom = null;
    playerName = '';
    playerCard = [];
    markedNumbers = [];
    gameState = {
        extractedNumbers: [],
        currentNumber: null,
        isGameStarted: false,
        players: {},
        winners: { ambo: [], terno: [], quaterna: [], cinquina: [] }
    };
    extractionTimes = [];
    lastExtractionTime = null;
    window.tombolaNotified = false;
    
    playerPanel.style.display = 'none';
    playerSetup.style.display = 'block';
    playerNameInput.value = '';
    
    updateUI();
}

// Notifiche
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Rimuovi notifiche precedenti se troppe
    const allNotifications = document.querySelectorAll('.notification');
    if (allNotifications.length > 3) {
        allNotifications[0].remove();
    }
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Aggiungi alla chat
    addChatMessage('system', message);
}

// Aggiungi messaggio chat
function addChatMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = sender === 'system' ? 'system-message' : 'chat-message';
    
    if (sender === 'system') {
        messageElement.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${sender}</span>
                    <span class="message-time">${new Date().toLocaleTimeString('it-IT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}</span>
                </div>
                <div class="message-text">${message}</div>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageElement);
    
    // Limita a 50 messaggi
    const allMessages = chatMessages.querySelectorAll('.chat-message, .system-message');
    if (allMessages.length > 50) {
        allMessages[0].remove();
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Suoni
function playExtractionSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio non supportato');
    }
}

function playMarkSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio non supportato');
    }
}

function playWinSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Suono di vittoria più elaborato
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do alto
        let currentTime = audioContext.currentTime;
        
        notes.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + 0.3);
            
            currentTime += 0.1;
        });
    } catch (e) {
        console.log('Audio non supportato');
    }
}

function playTombolaSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Fanfara per Tombola
        const notes = [
            { freq: 523.25, duration: 0.2 }, // Do
            { freq: 659.25, duration: 0.2 }, // Mi
            { freq: 783.99, duration: 0.2 }, // Sol
            { freq: 1046.50, duration: 0.4 }, // Do alto
            { freq: 783.99, duration: 0.2 }, // Sol
            { freq: 1046.50, duration: 0.6 } // Do alto lungo
        ];
        let currentTime = audioContext.currentTime;
        
        notes.forEach(note => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = note.freq;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.4, currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + note.duration);
            
            currentTime += note.duration * 0.8;
        });
    } catch (e) {
        console.log('Audio non supportato');
    }
}

// Socket Listeners
socket.on('connect', () => {
    console.log('Connesso al server');
    connectionStatus.textContent = 'Connesso';
    connectionStatus.style.color = '#4cd964';
});

socket.on('disconnect', () => {
    console.log('Disconnesso dal server');
    connectionStatus.textContent = 'Disconnesso';
    connectionStatus.style.color = '#ff6b6b';
    showNotification('Disconnesso dal server. Tentativo di riconnessione...', 'warning');
});

socket.on('room-joined', (data) => {
    currentRoom = data.roomCode;
    playerCard = data.playerCard || [];
    markedNumbers = data.markedNumbers || [];
    gameState.extractedNumbers = data.extractedNumbers || [];
    gameState.currentNumber = data.currentNumber || null;
    gameState.isGameStarted = data.isGameStarted || false;
    gameState.winners = data.winners || { ambo: [], terno: [], quaterna: [], cinquina: [] };
    
    playerNameDisplay.textContent = playerName;
    roomInfoDisplay.textContent = `Stanza: ${data.roomCode}`;
    
    playerSetup.style.display = 'none';
    playerPanel.style.display = 'block';
    
    // Ripristina preferenze
    const savedSound = localStorage.getItem('tombolaSoundEnabled');
    const savedAutoMark = localStorage.getItem('tombolaAutoMark');
    
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
        soundToggle.innerHTML = soundEnabled ? 
            '<i class="fas fa-volume-up"></i>' : 
            '<i class="fas fa-volume-mute"></i>';
        soundToggle.classList.toggle('active', soundEnabled);
    }
    
    if (savedAutoMark !== null) {
        autoMarkEnabled = savedAutoMark === 'true';
        autoMarkBtn.classList.toggle('active', autoMarkEnabled);
        autoMarkBtn.innerHTML = autoMarkEnabled ? 
            '<i class="fas fa-robot"></i> Auto-segna ON' : 
            '<i class="fas fa-robot"></i> Auto-segna';
    }
    
    showNotification(`Benvenuto ${playerName}! Unito alla stanza ${data.roomCode}`, 'success');
    addChatMessage('system', `Ti sei unito alla stanza ${data.roomCode} come "${playerName}"`);
    
    updateUI();
    
    // Auto-segna immediatamente se attivo
    if (autoMarkEnabled) {
        setTimeout(() => autoMarkExtractedNumbers(), 500);
    }
});

socket.on('number-extracted', (data) => {
    gameState.extractedNumbers = data.extractedNumbers;
    gameState.currentNumber = data.number;
    gameState.winners = data.winners;
    
    if (autoMarkEnabled) {
        setTimeout(() => autoMarkExtractedNumbers(), 100);
    }
    
    updateUI();
    playExtractionSound();
    addChatMessage('system', `🎲 Numero estratto: <strong>${data.number}</strong>`);
});

socket.on('number-marked', (data) => {
    markedNumbers = data.markedNumbers;
    updateCardDisplay();
    checkWins();
});

socket.on('player-count', (count) => {
    playerCountElement.textContent = count;
    addChatMessage('system', `👥 ${count} giocatori in stanza`);
});

socket.on('new-player', (data) => {
    addChatMessage('system', `👋 ${data.name} si è unito alla partita`);
});

socket.on('player-left', (data) => {
    addChatMessage('system', `👋 ${data.playerName} ha lasciato la partita`);
});

socket.on('winner', (data) => {
    const winMessages = {
        'ambo': 'ha fatto <strong>Ambo</strong>! 🎉 (2 numeri)',
        'terno': 'ha fatto <strong>Terno</strong>! 🎊 (3 numeri)',
        'quaterna': 'ha fatto <strong>Quaterna</strong>! 🏆 (4 numeri)',
        'cinquina': 'ha fatto <strong>Cinquina</strong>! 🎖️ (5 numeri - riga completa)'
    };
    
    const isMe = data.playerId === socket.id;
    const message = isMe ? 
        `🎉 <strong>Hai fatto ${data.type}!</strong> ${winMessages[data.type].replace('ha fatto', '')}` :
        `🎉 <strong>${data.player}</strong> ${winMessages[data.type]}`;
    
    showNotification(message.replace(/<[^>]*>/g, ''), isMe ? 'success' : 'info');
    addChatMessage('system', message);
    
    if (isMe) {
        playWinSound();
        
        // Evidenzia i numeri vincenti
        if (data.numbers && data.numbers.length > 0) {
            data.numbers.forEach(num => {
                const element = document.querySelector(`.card-number[data-number="${num}"]`);
                if (element) {
                    element.classList.add('winning');
                    element.style.animation = 'glow 1s infinite alternate';
                }
            });
        }
    }
});

socket.on('game-reset', (data) => {
    gameState.extractedNumbers = data.extractedNumbers || [];
    gameState.currentNumber = data.currentNumber || null;
    gameState.isGameStarted = data.isGameStarted || false;
    gameState.winners = data.winners || { ambo: [], terno: [], quaterna: [], cinquina: [] };
    
    markedNumbers = [];
    extractionTimes = [];
    lastExtractionTime = null;
    window.tombolaNotified = false;
    
    updateUI();
    showNotification('Partita resettata dal master', 'info');
    addChatMessage('system', '🔄 Il master ha resettato la partita. Pronti per una nuova partita!');
});

socket.on('error', (message) => {
    showNotification(message, 'error');
    addChatMessage('system', `❌ Errore: ${message}`);
});

socket.on('room-closed', (message) => {
    showNotification(message, 'warning');
    addChatMessage('system', `🚪 ${message}`);
    setTimeout(() => {
        resetToSetup();
        showNotification('Stanza chiusa. Tornato alla schermata iniziale.', 'info');
    }, 3000);
});

socket.on('kicked', (message) => {
    showNotification(message, 'error');
    addChatMessage('system', `👢 ${message}`);
    resetToSetup();
});

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    
    // Controlla parametri URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        roomCodeInput.value = roomParam.toUpperCase();
        roomCodeInput.focus();
    } else {
        playerNameInput.focus();
    }
    
    // Setup tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Rimuovi active da tutti
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Aggiungi active a quello cliccato
            this.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
    
    // Setup suoni iniziali
    const savedSound = localStorage.getItem('tombolaSoundEnabled');
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
    }
    
    // Setup auto-mark iniziale
    const savedAutoMark = localStorage.getItem('tombolaAutoMark');
    if (savedAutoMark !== null) {
        autoMarkEnabled = savedAutoMark === 'true';
    }
});
