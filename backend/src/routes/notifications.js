const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { checkSubscription, FREE_GAME_LIMIT } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ─── GET INBOX MESSAGES ──────────────────────────────────
router.get('/inbox', checkSubscription, async (req, res, next) => {
  try {
    const limit = req.user.subscription === 'PREMIUM' ? 100 : 20;  // Premium sees more
    const messages = await prisma.inboxMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const unreadCount = await prisma.inboxMessage.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ messages, unreadCount });
  } catch (err) { next(err); }
});

// ─── MARK INBOX READ ─────────────────────────────────────
router.put('/inbox/:id/read', async (req, res, next) => {
  try {
    await prisma.inboxMessage.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

// ─── MARK ALL INBOX READ ─────────────────────────────────
router.put('/inbox/read-all', async (req, res, next) => {
  try {
    await prisma.inboxMessage.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

// ─── GET NOTIFICATIONS ───────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications });
  } catch (err) { next(err); }
});

// ─── WHATSAPP TOGGLE ─────────────────────────────────────
router.put('/whatsapp-toggle', async (req, res, next) => {
  try {
    const { enabled } = req.body;
    await prisma.user.update({ where: { id: req.user.id }, data: { whatsappEnabled: !!enabled } });
    res.json({ whatsappEnabled: !!enabled });
  } catch (err) { next(err); }
});

// ─── GET PREFERENCES ─────────────────────────────────────
router.get('/preferences', async (req, res) => {
  res.json({ whatsappEnabled: req.user.whatsappEnabled, preferences: req.user.preferences || {} });
});

module.exports = router;
