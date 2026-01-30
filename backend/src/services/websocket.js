/**
 * WebSocket Service for Real-time Game Updates
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Store connected clients
const clients = new Map();
const gameRooms = new Map();

/**
 * Setup WebSocket server
 */
const setupWebSocket = (wss) => {
  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    let userId = null;
    let currentGameId = null;

    console.log(`WebSocket client connected: ${clientId}`);

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);

        switch (message.type) {
          case 'AUTH':
            // Authenticate the connection
            userId = await authenticateWebSocket(message.token);
            if (userId) {
              clients.set(clientId, { ws, userId });
              ws.send(JSON.stringify({ 
                type: 'AUTH_SUCCESS', 
                userId,
                clientId 
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: 'AUTH_FAILED', 
                error: 'Invalid token' 
              }));
            }
            break;

          case 'JOIN_GAME':
            if (!userId) {
              ws.send(JSON.stringify({ type: 'ERROR', error: 'Not authenticated' }));
              return;
            }
            currentGameId = message.gameId;
            joinGameRoom(clientId, message.gameId);
            ws.send(JSON.stringify({ 
              type: 'JOINED_GAME', 
              gameId: message.gameId 
            }));
            break;

          case 'LEAVE_GAME':
            if (currentGameId) {
              leaveGameRoom(clientId, currentGameId);
              currentGameId = null;
            }
            break;

          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'ERROR', error: 'Invalid message format' }));
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      clients.delete(clientId);
      if (currentGameId) {
        leaveGameRoom(clientId, currentGameId);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    });

    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'CONNECTED', 
      clientId,
      message: 'Please authenticate with AUTH message' 
    }));
  });

  console.log('WebSocket server initialized');
};

/**
 * Authenticate WebSocket connection
 */
const authenticateWebSocket = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
};

/**
 * Join a game room for real-time updates
 */
const joinGameRoom = (clientId, gameId) => {
  if (!gameRooms.has(gameId)) {
    gameRooms.set(gameId, new Set());
  }
  gameRooms.get(gameId).add(clientId);
  console.log(`Client ${clientId} joined game room ${gameId}`);
};

/**
 * Leave a game room
 */
const leaveGameRoom = (clientId, gameId) => {
  const room = gameRooms.get(gameId);
  if (room) {
    room.delete(clientId);
    if (room.size === 0) {
      gameRooms.delete(gameId);
    }
  }
};

/**
 * Broadcast message to all clients in a game room
 */
const broadcastToGame = (gameId, message) => {
  const room = gameRooms.get(gameId);
  if (!room) return;

  const payload = JSON.stringify(message);
  
  room.forEach((clientId) => {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(payload);
    }
  });
};

/**
 * Send message to specific user
 */
const sendToUser = (userId, message) => {
  const payload = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === 1) {
      client.ws.send(payload);
    }
  });
};

/**
 * Broadcast game state update
 */
const broadcastGameUpdate = (gameId, updateType, data) => {
  broadcastToGame(gameId, {
    type: 'GAME_UPDATE',
    updateType,
    gameId,
    data,
    timestamp: Date.now()
  });
};

/**
 * Notify about top-up request
 */
const notifyTopUpRequest = (gameId, hostId, request) => {
  // Broadcast to game room
  broadcastToGame(gameId, {
    type: 'TOP_UP_REQUEST',
    request,
    timestamp: Date.now()
  });

  // Also notify host specifically
  sendToUser(hostId, {
    type: 'TOP_UP_REQUEST_ALERT',
    request,
    timestamp: Date.now()
  });
};

/**
 * Notify about top-up status change
 */
const notifyTopUpStatus = (gameId, playerId, request, status) => {
  broadcastToGame(gameId, {
    type: 'TOP_UP_STATUS',
    request,
    status,
    timestamp: Date.now()
  });

  sendToUser(playerId, {
    type: 'TOP_UP_RESPONSE',
    request,
    status,
    timestamp: Date.now()
  });
};

/**
 * Notify about transaction
 */
const notifyTransaction = (gameId, transaction) => {
  broadcastToGame(gameId, {
    type: 'TRANSACTION',
    transaction,
    timestamp: Date.now()
  });
};

/**
 * Notify game status change
 */
const notifyGameStatus = (gameId, status, data = {}) => {
  broadcastToGame(gameId, {
    type: 'GAME_STATUS',
    status,
    data,
    timestamp: Date.now()
  });
};

module.exports = {
  setupWebSocket,
  broadcastToGame,
  sendToUser,
  broadcastGameUpdate,
  notifyTopUpRequest,
  notifyTopUpStatus,
  notifyTransaction,
  notifyGameStatus
};
