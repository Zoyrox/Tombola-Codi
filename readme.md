# 🎄 Tombola Natalizia

Una web app di Tombola (Bingo italiano) con tema natalizio, multiplayer in tempo reale e sistema di stanze.

## 🎯 Funzionalità

### 👑 Pannello Admin (Master)
- Crea stanze di gioco con codice unico
- Gestisce fino a 25 giocatori per stanza
- Estrae numeri casuali (1-90)
- Monitora tutti i giocatori in tempo reale
- Visualizza vincitori (Ambo, Terno, Quaterna, Cinquina)
- Controlli completi della partita (inizia, pausa, reset, termina)
- Condivisione facile della stanza via link/QR code

### 👥 Pannello Giocatore
- Unisciti a stanze con codice
- Cartella Tombola personalizzata (3 righe, 9 colonne, 5 numeri per riga)
- Segna numeri in tempo reale
- Sistema di vittorie multiple per riga
- Classifica vincitori aggiornata in tempo reale
- Statistiche personali
- Modalità auto-segna opzionale

### 🎮 Regole del Gioco
- Numeri da 1 a 90
- Ogni giocatore ha una cartella unica con 15 numeri (5 per riga)
- Vittorie possibili:
  - **Ambo**: 2 numeri sulla stessa riga
  - **Terno**: 3 numeri sulla stessa riga
  - **Quaterna**: 4 numeri sulla stessa riga
  - **Cinquina**: 5 numeri sulla stessa riga (riga completa)
- Ogni riga può vincere solo una volta per tipo

## 🚀 Installazione

### Prerequisiti
- Node.js 14 o superiore
- npm o yarn

### Passi di Installazione

1. **Clona il repository**
```bash
git clone <repository-url>
cd tombola-christmas