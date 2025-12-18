// admin.js
let numeriEstratti = [];
const numeriTombola = Array.from({length: 90}, (_, i) => i + 1);

document.addEventListener('DOMContentLoaded', () => {
  const btnEstrai = document.getElementById('estrai');
  const btnReset = document.getElementById('reset');
  const numeriContainer = document.getElementById('numeri-estratti');
  
  if (btnEstrai) {
    btnEstrai.addEventListener('click', estraiNumero);
  }
  
  if (btnReset) {
    btnReset.addEventListener('click', resetGioco);
  }
  
  // Inizializza display numeri
  aggiornaDisplayNumeri();
});

function estraiNumero() {
  if (numeriEstratti.length >= 90) {
    mostraMessaggio('Tutti i numeri sono stati estratti!', 'warning');
    return;
  }
  
  // Numeri non ancora estratti
  const numeriDisponibili = numeriTombola.filter(n => !numeriEstratti.includes(n));
  const numero = numeriDisponibili[Math.floor(Math.random() * numeriDisponibili.length)];
  
  numeriEstratti.push(numero);
  
  // Invia a server (e quindi a tutti i giocatori)
  socket.emit('numero-estratto', numero);
  
  // Aggiorna display locale
  aggiornaDisplayNumeri();
  mostraMessaggio(`Estratto: ${numero}`, 'success');
  
  console.log('Numeri estratti:', numeriEstratti);
}

function resetGioco() {
  numeriEstratti = [];
  socket.emit('reset-gioco');
  aggiornaDisplayNumeri();
  mostraMessaggio('Gioco resettato!', 'info');
}

function aggiornaDisplayNumeri() {
  const container = document.getElementById('numeri-estratti');
  if (!container) return;
  
  container.innerHTML = '';
  numeriEstratti.forEach(numero => {
    const div = document.createElement('div');
    div.className = 'numero-estratto';
    div.textContent = numero;
    container.appendChild(div);
  });
  
  // Aggiorna contatore
  const counter = document.getElementById('contatore');
  if (counter) {
    counter.textContent = `Numeri estratti: ${numeriEstratti.length}/90`;
  }
}
