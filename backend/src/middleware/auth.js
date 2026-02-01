const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'pokerledger-secret-change-me';

// Verify JWT and attach user to req
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role hierarchy: SUPER_ADMIN > ADMIN > HOST > PLAYER
const ROLE_LEVEL = { SUPER_ADMIN: 4, ADMIN: 3, HOST: 2, PLAYER: 1 };

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (ROLE_LEVEL[req.user.role] < ROLE_LEVEL[minRole]) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Subscription check — FREE sees last 3 games
const FREE_GAME_LIMIT = 3;

const checkSubscription = (req, res, next) => {
  req.gameLimit = req.user.subscription === 'PREMIUM' ? null : FREE_GAME_LIMIT;
  next();
};

// Can user see rake? Only SUPER_ADMIN, ADMIN, HOST
const canSeeRake = (user) => ['SUPER_ADMIN', 'ADMIN', 'HOST'].includes(user.role);

module.exports = {
  authenticate, requireRole, requireMinRole, checkSubscription,
  canSeeRake, JWT_SECRET, ROLE_LEVEL, FREE_GAME_LIMIT
};
