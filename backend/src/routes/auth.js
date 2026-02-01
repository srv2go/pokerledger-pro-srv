const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const generateToken = (userId, expiresIn = '7d') =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn });

const generateRememberToken = (userId) =>
  jwt.sign({ userId, remember: true }, JWT_SECRET, { expiresIn: '90d' });

// ─── REGISTER ────────────────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('displayName').trim().isLength({ min: 2 }),
  body('phone').optional().trim(),
  body('role').optional().isIn(['PLAYER', 'HOST']),  // only these via self-reg
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, displayName, phone, role = 'PLAYER' } = req.body;

    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName, phone, role },
      select: { id: true, email: true, displayName: true, phone: true, role: true, whatsappEnabled: true }
    });

    const token = generateToken(user.id);
    const rememberToken = generateRememberToken(user.id);

    res.status(201).json({ user, token, rememberToken });
  } catch (err) { next(err); }
});

// ─── LOGIN ───────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  body('rememberMe').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user.id, rememberMe ? '30d' : '7d');
    let rememberToken = null;

    if (rememberMe) {
      rememberToken = generateRememberToken(user.id);
      await prisma.user.update({ where: { id: user.id }, data: { rememberToken } });
    }

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, token, rememberToken });
  } catch (err) { next(err); }
});

// ─── AUTO-LOGIN (remember me token) ─────────────────────
router.post('/auto-login', async (req, res, next) => {
  try {
    const { rememberToken } = req.body;
    if (!rememberToken) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(rememberToken, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const token = generateToken(user.id, '30d');
    const newRememberToken = generateRememberToken(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { rememberToken: newRememberToken } });

    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: safeUser, token, rememberToken: newRememberToken });
  } catch (err) {
    return res.status(401).json({ error: 'Token expired. Please login.' });
  }
});



// ─── GET PROFILE ────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const { passwordHash, pin, rememberToken, ...user } = req.user;
  res.json({ user: { ...user, hasPin: !!pin } });
});

// ─── UPDATE PROFILE ─────────────────────────────────────
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { displayName, phone, whatsappEnabled, preferences } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(displayName && { displayName }),
        ...(phone !== undefined && { phone }),
        ...(whatsappEnabled !== undefined && { whatsappEnabled }),
        ...(preferences && { preferences }),
      },
      select: { id: true, email: true, displayName: true, phone: true, role: true, whatsappEnabled: true }
    });
    res.json({ user });
  } catch (err) { next(err); }
});

// ─── PROMOTE USER (super admin / admin only) ────────────
router.post('/promote', authenticate, async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const caller = req.user;

    // Only SUPER_ADMIN can promote to ADMIN/SUPER_ADMIN
    // ADMIN can promote to HOST
    if (role === 'SUPER_ADMIN') {
      if (caller.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only super admin can promote to super admin' });
      const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
      if (superAdminCount >= 3) return res.status(400).json({ error: 'Maximum 3 super admins allowed' });
    } else if (role === 'ADMIN') {
      if (caller.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Only super admin can promote to admin' });
    } else if (role === 'HOST') {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(caller.role)) return res.status(403).json({ error: 'Only admin+ can promote to host' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role, ...(role === 'HOST' && ['SUPER_ADMIN', 'ADMIN'].includes(caller.role) ? { managedById: caller.id } : {}) },
      select: { id: true, email: true, displayName: true, role: true }
    });

    res.json({ user, message: `User promoted to ${role}` });
  } catch (err) { next(err); }
});

module.exports = router;
