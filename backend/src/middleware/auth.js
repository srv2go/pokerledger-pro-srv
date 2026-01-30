const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        phone: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to check if user is a host
 */
const requireHost = (req, res, next) => {
  if (req.user.role !== 'HOST') {
    return res.status(403).json({ error: 'Host access required' });
  }
  next();
};

/**
 * Middleware to check if user is the game host
 */
const requireGameHost = async (req, res, next) => {
  const gameId = req.params.gameId || req.params.id;
  
  if (!gameId) {
    return res.status(400).json({ error: 'Game ID required' });
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { hostId: true }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only the game host can perform this action' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is participant in game
 */
const requireGameParticipant = async (req, res, next) => {
  const gameId = req.params.gameId || req.params.id;
  
  if (!gameId) {
    return res.status(400).json({ error: 'Game ID required' });
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          where: { playerId: req.user.id }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Allow if user is host or player
    if (game.hostId !== req.user.id && game.players.length === 0) {
      return res.status(403).json({ error: 'You are not a participant in this game' });
    }

    req.game = game;
    req.isHost = game.hostId === req.user.id;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateToken,
  requireHost,
  requireGameHost,
  requireGameParticipant
};
