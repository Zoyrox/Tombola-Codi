// PERCORSO RELATIVO PER IMPORT (se dividi in moduli)
// import { createRoom } from './modules/roomManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Usa l'URL del server in modo relativo: stesso host, porta 3000
    const socket = io('http://localhost:3000');
    
    // Crea stanza (Admin)
    document.getElementById('createRoomBtn').addEventListener('click', () => {
        socket.emit('create-room');
        showLoading();
    });
    
    // Unisciti a stanza
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
        const roomCode = document.getElementById('joinCode').value.toUpperCase();
        if (roomCode.length === 6) {
            document.getElementById('playerNameInput').classList.remove('hidden');
        } else {
            alert('Il codice stanza deve essere di 6 caratteri');
        }
    });
    
    // Entra come giocatore
    document.getElementById('startPlayingBtn').addEventListener('click', () => {
        const roomCode = document.getElementById('joinCode').value.toUpperCase();
        const playerName = document.getElementById('playerName').value || 'Giocatore';
        
        if (playerName.trim()) {
            socket.emit('join-room', { roomCode, playerName });
            showLoading();
        }
    });
    
    // Ricevi conferma creazione stanza
    socket.on('room-created', (data) => {
        hideLoading();
        document.getElementById('roomCode').textContent = data.roomCode;
        document.getElementById('inviteLink').value = data.link;
        document.getElementById('roomInfo').classList.remove('hidden');
        
        // Reindirizza admin alla pagina admin
        setTimeout(() => {
            window.location.href = `admin.html?room=${data.roomCode}&admin=true`;
        }, 2000);
    });
    
    // Ricevi conferma unione
    socket.on('room-joined', (data) => {
        hideLoading();
        // Reindirizza giocatore alla pagina giocatore
        const playerName = document.getElementById('playerName').value || 'Giocatore';
        window.location.href = `player.html?room=${data.roomCode}&player=${encodeURIComponent(playerName)}`;
    });
    
    // Gestisci errori
    socket.on('error', (message) => {
        hideLoading();
        alert(`Errore: ${message}`);
    });
    
    // Funzioni utility
    function showLoading() {
        document.getElementById('loadingModal').classList.remove('hidden');
    }
    
    function hideLoading() {
        document.getElementById('loadingModal').classList.add('hidden');
    }
});

// Funzione globale per copiare il link
function copyLink() {
    const linkInput = document.getElementById('inviteLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copiato negli appunti!');
}