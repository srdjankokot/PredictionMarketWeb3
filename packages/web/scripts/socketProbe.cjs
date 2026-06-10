// Dev probe: connects as a guest, joins the market:list room, and logs every
// server event with a timestamp — used to verify market:created / market:expired
// delivery without a browser.
const { io } = require('socket.io-client');

const s = io('http://localhost:3000', { transports: ['websocket', 'polling'] });

s.on('connect', () => {
  console.log(new Date().toISOString(), 'CONNECTED', s.id);
  s.emit('join:list');
});
s.on('connect_error', (e) => console.log(new Date().toISOString(), 'CONNECT_ERROR', e.message));
s.on('disconnect', (r) => console.log(new Date().toISOString(), 'DISCONNECT', r));
s.onAny((event, payload) => {
  console.log(new Date().toISOString(), 'EVENT', event, JSON.stringify(payload).slice(0, 140));
});
