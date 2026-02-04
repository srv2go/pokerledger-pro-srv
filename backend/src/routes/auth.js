const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET, authenticate } = require('../middleware/auth');
const { seedDefaultConsents, setChannelConsent } = require('../services/messaging');

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
  body('pin').optional().isLength({ min: 4, max: 6 }),
  body('role').optional().isIn(['PLAYER', 'HOST']),  // only these via self-reg
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, displayName, phone, pin, role = 'PLAYER' } = req.body;

    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName, phone, pin: pinHash, role },
      select: { id: true, email: true, displayName: true, phone: true, role: true, subscription: true, whatsappEnabled: true }
    });
    await seedDefaultConsents(user.id);

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

    const { passwordHash: _, pin: __, ...safeUser } = user;
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

    const { passwordHash: _, pin: __, ...safeUser } = user;
    res.json({ user: safeUser, token, rememberToken: newRememberToken });
  } catch (err) {
    return res.status(401).json({ error: 'Token expired. Please login.' });
  }
});

// ─── PIN VERIFY (quick unlock) ──────────────────────────
router.post('/verify-pin', [body('pin').isLength({ min: 4, max: 6 })], async (req, res, next) => {
  try {
    const { pin, userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.pin) return res.status(400).json({ error: 'No PIN set' });

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) return res.status(401).json({ error: 'Invalid PIN' });

    const token = generateToken(user.id, '30d');
    const { passwordHash: _, pin: __, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) { next(err); }
});

// ─── SET/UPDATE PIN ─────────────────────────────────────
router.post('/set-pin', authenticate, [body('pin').isLength({ min: 4, max: 6 })], async (req, res, next) => {
  try {
    const pinHash = await bcrypt.hash(req.body.pin, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { pin: pinHash } });
    res.json({ message: 'PIN set successfully' });
  } catch (err) { next(err); }
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
      select: { id: true, email: true, displayName: true, phone: true, role: true, subscription: true, whatsappEnabled: true }
    });
    if (whatsappEnabled !== undefined) {
      await setChannelConsent(user.id, 'WHATSAPP', !!whatsappEnabled, 'profile_toggle');
    }
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

// ─── DEBUG: LIST ALL USERS (for admin troubleshooting) ──
router.get('/debug/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, displayName: true, role: true, subscription: true, whatsappEnabled: true, createdAt: true }
    });
    const roleCounts = {
      SUPER_ADMIN: users.filter(u => u.role === 'SUPER_ADMIN').length,
      ADMIN: users.filter(u => u.role === 'ADMIN').length,
      HOST: users.filter(u => u.role === 'HOST').length,
      PLAYER: users.filter(u => u.role === 'PLAYER').length,
    };
    res.json({ total: users.length, roleCounts, users });
  } catch (err) { next(err); }
});

// ─── BOOTSTRAP: Make a user SUPER_ADMIN (only if no super admins exist) ──
router.post('/bootstrap-admin', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Check if any super admins exist
    const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (superAdminCount > 0) {
      return res.status(403).json({ error: 'Super admin already exists. Use /promote endpoint instead.' });
    }
    
    // Find user by email and promote to SUPER_ADMIN
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true, displayName: true, role: true }
    });
    
    res.json({ success: true, message: `${user.displayName} is now SUPER_ADMIN`, user });
  } catch (err) { 
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    next(err); 
  }
});

module.exports = router;
