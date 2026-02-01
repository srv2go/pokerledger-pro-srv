const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

let wss = null;
const gameRooms = new Map(); // gameId -> Set<ws>

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'AUTH') {
          try {
            const decoded = jwt.verify(msg.token, JWT_SECRET);
            ws.userId = decoded.userId;
            ws.send(JSON.stringify({ type: 'AUTH_OK' }));
          } catch { ws.send(JSON.stringify({ type: 'AUTH_FAIL' })); }
        } else if (msg.type === 'JOIN_GAME') {
          if (ws.gameId) { gameRooms.get(ws.gameId)?.delete(ws); }
          ws.gameId = msg.gameId;
          if (!gameRooms.has(msg.gameId)) gameRooms.set(msg.gameId, new Set());
          gameRooms.get(msg.gameId).add(ws);
        } else if (msg.type === 'LEAVE_GAME') {
          if (ws.gameId) { gameRooms.get(ws.gameId)?.delete(ws); ws.gameId = null; }
        }
      } catch {}
    });
    ws.on('close', () => { if (ws.gameId) gameRooms.get(ws.gameId)?.delete(ws); });
  });

  setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
};

const broadcast = (gameId, message) => {
  const clients = gameRooms.get(gameId);
  if (!clients) return;
  const data = JSON.stringify(message);
  clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(data); });
};

const notifyTransaction = (gameId, tx) => broadcast(gameId, { type: 'TRANSACTION', gameId, data: tx });
const broadcastGameUpdate = (gameId, data) => broadcast(gameId, { type: 'GAME_UPDATE', gameId, data });

module.exports = { initWebSocket, notifyTransaction, broadcastGameUpdate, broadcast };
