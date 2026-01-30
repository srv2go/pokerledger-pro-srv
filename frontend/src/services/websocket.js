/**
 * WebSocket Service for Real-time Updates
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isAuthenticated = false;
    this.currentGameId = null;
    this.messageQueue = [];
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Authenticate
        const token = localStorage.getItem('token');
        if (token) {
          this.send({ type: 'AUTH', token });
        }
        
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isAuthenticated = false;
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.currentGameId = null;
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'AUTH_SUCCESS':
        this.isAuthenticated = true;
        // Process queued messages
        while (this.messageQueue.length > 0) {
          this.send(this.messageQueue.shift());
        }
        // Rejoin game if we were in one
        if (this.currentGameId) {
          this.joinGame(this.currentGameId);
        }
        break;

      case 'AUTH_FAILED':
        console.error('WebSocket authentication failed');
        this.isAuthenticated = false;
        break;

      default:
        // Emit to listeners
        this.emit(message.type, message);
    }
  }

  joinGame(gameId) {
    this.currentGameId = gameId;
    this.send({ type: 'JOIN_GAME', gameId });
  }

  leaveGame() {
    if (this.currentGameId) {
      this.send({ type: 'LEAVE_GAME' });
      this.currentGameId = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('WebSocket listener error:', error);
      }
    });
  }
}

// Singleton instance
const wsService = new WebSocketService();

export default wsService;
