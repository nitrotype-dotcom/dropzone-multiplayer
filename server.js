const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');
const PORT = Number(process.env.PORT || 8080);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('DropZone multiplayer server is running. Connect using the WebSocket address.\n');
});
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });
const clients = new Map();
const rooms = new Map();
const codeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newId() { return crypto.randomBytes(8).toString('hex'); }
function newCode() {
  let code;
  do { code = Array.from({ length: 5 }, () => codeChars[Math.floor(Math.random() * codeChars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}
function send(ws, obj) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
function roomPlayers(room) {
  return [...room.players].map(([id, p]) => ({ id, name: p.name, x: p.x, y: p.y, angle: p.angle, color: p.color, driving: p.driving, map: p.map }));
}
function broadcastRoom(room, obj) { for (const id of room.players.keys()) { const c = clients.get(id); if (c) send(c.ws, obj); } }
function publish(room) { broadcastRoom(room, { type: 'players', code: room.code, leaderId: room.leaderId, players: roomPlayers(room) }); }
function leave(id) {
  const c = clients.get(id); if (!c || !c.room) return;
  const room = rooms.get(c.room); c.room = null;
  if (!room) return;
  room.players.delete(id);
  send(c.ws, { type: 'left' });
  if (!room.players.size) { rooms.delete(room.code); return; }
  if (room.leaderId === id) room.leaderId = room.players.keys().next().value;
  publish(room);
}
function join(ws, id, code, name) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const room = rooms.get(code);
  if (!room) return send(ws, { type: 'error', message: 'That party code was not found.' });
  if (room.players.size >= 8) return send(ws, { type: 'error', message: 'That party is full (maximum 8 players).' });
  leave(id);
  const c = clients.get(id); if (!c) return;
  c.room = code;
  room.players.set(id, { name: cleanName(name), x: 500, y: 500, angle: 0, color: '#5be7ff', driving: false, map: 'beach' });
  broadcastRoom(room, { type: 'party', code: room.code, leaderId: room.leaderId, players: roomPlayers(room) });
}
function cleanName(n) { return String(n || 'Player').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 16) || 'Player'; }
wss.on('connection', (ws) => {
  const id = newId(); clients.set(id, { ws, room: null });
  send(ws, { type: 'welcome', id });
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return send(ws, { type: 'error', message: 'Invalid message.' }); }
    if (!m || typeof m.type !== 'string') return;
    const c = clients.get(id); if (!c) return;
    if (m.type === 'hello') { c.name = cleanName(m.name); return; }
    if (m.type === 'create') {
      leave(id); const code = newCode();
      const room = { code, leaderId: id, players: new Map() }; rooms.set(code, room); c.room = code;
      room.players.set(id, { name: cleanName(m.name || c.name), x: 500, y: 500, angle: 0, color: '#b8ff21', driving: false, map: 'beach' });
      return send(ws, { type: 'party', code, leaderId: id, players: roomPlayers(room) });
    }
    if (m.type === 'join') return join(ws, id, m.code, m.name || c.name);
    if (m.type === 'leave') { leave(id); return; }
    if (m.type === 'update') {
      const room = rooms.get(c.room); if (!room) return;
      const p = room.players.get(id); if (!p) return;
      p.name = cleanName(m.name || p.name);
      for (const k of ['x', 'y', 'angle']) if (Number.isFinite(m[k])) p[k] = Math.max(-100000, Math.min(100000, m[k]));
      if (typeof m.color === 'string' && /^#[0-9a-f]{6}$/i.test(m.color)) p.color = m.color;
      p.driving = !!m.driving;
      if (typeof m.map === 'string') p.map = m.map.slice(0, 20);
      return publish(room);
    }
    if (m.type === 'start') {
      const room = rooms.get(c.room); if (!room) return send(ws, { type: 'error', message: 'Create or join a party first.' });
      if (room.leaderId !== id) return send(ws, { type: 'error', message: 'Only the party leader can start the match.' });
      const maps = ['beach','pirate','desert','city','forest','snow','lava','jungle','neon','candy','boss'];
      const diffs = ['easy','normal','hard'];
      broadcastRoom(room, { type: 'start', map: maps.includes(m.map) ? m.map : 'beach', difficulty: diffs.includes(m.difficulty) ? m.difficulty : 'normal' });
    }
  });
  ws.on('close', () => { leave(id); clients.delete(id); });
  ws.on('error', () => {});
});
setInterval(() => { for (const ws of wss.clients) if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 25000).unref();
server.listen(PORT, '0.0.0.0', () => console.log(`DropZone server listening on ${PORT}`));
