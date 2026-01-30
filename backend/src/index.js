require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const http = require('http');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const playerRoutes = require('./routes/players');
const transactionRoutes = require('./routes/transactions');
const notificationRoutes = require('./routes/notifications');
const webhookRoutes = require('./routes/webhooks');
const { authenticateToken } = require('./middleware/auth');
const { setupWebSocket } = require('./services/websocket');

const app = express();
const server = http.createServer(app);

// Trust proxy - required for Render and other reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - allow mobile app and web
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: process.env.FRONTEND_URL === '*' ? '*' : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', authenticateToken, gameRoutes);
app.use('/api/players', authenticateToken, playerRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// Webhook routes (no auth - verified by token)
app.use('/webhooks', webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// WebSocket setup for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    PokerLedger Pro API                    ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                          ║
║  WebSocket: ws://localhost:${PORT}/ws                        ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
