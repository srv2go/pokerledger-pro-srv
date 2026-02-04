require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const path = require('path');
const { initWebSocket } = require('./services/websocket');

const app = express();
const server = http.createServer(app);

// Trust proxy for Render (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auth middleware
const { authenticate } = require('./middleware/auth');

// Public routes
app.use('/api/auth', require('./routes/auth'));
app.use('/webhooks', require('./routes/webhooks'));

// Protected routes
app.use('/api/games', authenticate, require('./routes/games'));
app.use('/api/players', authenticate, require('./routes/players'));
app.use('/api/transactions', authenticate, require('./routes/transactions'));
app.use('/api/notifications', authenticate, require('./routes/notifications'));
app.use('/api/stats', authenticate, require('./routes/stats'));
app.use('/api/automations', authenticate, require('./routes/automations'));
app.use('/api/export', authenticate, require('./routes/export'));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')));
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Init WebSocket
initWebSocket(server);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
