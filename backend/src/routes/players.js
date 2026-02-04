const express = require('express');
const { body } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { requireMinRole } = require('../middleware/auth');
const { sendSettlementReminder, seedDefaultConsents, setChannelConsent } = require('../services/messaging');

const router = express.Router();
const prisma = new PrismaClient();

// ─── LIST PLAYERS ────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    if (role) where.role = role;

    const players = await prisma.user.findMany({
      where,
      select: { id: true, displayName: true, email: true, phone: true, role: true, subscription: true, whatsappEnabled: true, createdAt: true },
      orderBy: { displayName: 'asc' },
      take: 100,
    });
    res.json({ players });
  } catch (err) { next(err); }
});

// ─── GET PLAYER ──────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const player = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, displayName: true, email: true, phone: true, role: true, subscription: true, whatsappEnabled: true, createdAt: true },
    });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json({ player });
  } catch (err) { next(err); }
});

// ─── CREATE PLAYER (host adds new player) ────────────────
router.post('/', requireMinRole('HOST'), [
  body('displayName').trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().trim(),
], async (req, res, next) => {
  try {
    const { displayName, email, phone } = req.body;

    // Check for existing by email or phone
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.json({ player: existing, existing: true });
    }

    const player = await prisma.user.create({
      data: {
        displayName, email: email || `player_${Date.now()}@temp.local`, phone,
        role: 'PLAYER', passwordHash: null,
      },
      select: { id: true, displayName: true, email: true, phone: true, role: true },
    });
    await seedDefaultConsents(player.id);
    res.status(201).json({ player });
  } catch (err) { next(err); }
});

// ─── UPDATE PLAYER ───────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { displayName, phone, whatsappEnabled } = req.body;
    const player = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...(displayName && { displayName }), ...(phone !== undefined && { phone }), ...(whatsappEnabled !== undefined && { whatsappEnabled }) },
      select: { id: true, displayName: true, phone: true, role: true, whatsappEnabled: true },
    });
    if (whatsappEnabled !== undefined) {
      await setChannelConsent(player.id, 'WHATSAPP', !!whatsappEnabled, 'host_override');
    }
    res.json({ player });
  } catch (err) { next(err); }
});

// ─── PLAYER GAME HISTORY ─────────────────────────────────
router.get('/:id/history', async (req, res, next) => {
  try {
    const games = await prisma.gamePlayer.findMany({
      where: { playerId: req.params.id },
      include: {
        game: { select: { id: true, name: true, gameType: true, status: true, startTime: true, endTime: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const stats = {
      totalGames: games.length,
      totalBuyIn: games.reduce((s, g) => s + parseFloat(g.totalInvested || 0), 0),
      totalCashOut: games.reduce((s, g) => s + parseFloat(g.cashOut || 0), 0),
      totalProfit: games.reduce((s, g) => s + parseFloat(g.finalBalance || 0), 0),
      winRate: games.length > 0 ? (games.filter(g => parseFloat(g.finalBalance || 0) > 0).length / games.length * 100).toFixed(1) : 0,
    };

    res.json({ games, stats });
  } catch (err) { next(err); }
});

// ─── ROLLING BALANCES (host view of all players) ─────────
router.get('/balances/rolling', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const hostId = req.user.id;
    const balances = await prisma.rollingBalance.findMany({
      where: { hostId },
      include: {
        player: { select: { id: true, displayName: true, phone: true, email: true, whatsappEnabled: true } },
      },
      orderBy: { balance: 'asc' },
    });

    res.json({ balances });
  } catch (err) { next(err); }
});

// ─── SEND SETTLEMENT REMINDER ────────────────────────────
router.post('/reminder/:playerId', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const hostId = req.user.id;
    const { playerId } = req.params;
    const { message: customMessage } = req.body;

    const balance = await prisma.rollingBalance.findUnique({
      where: { playerId_hostId: { playerId, hostId } },
      include: { player: { select: { id: true, displayName: true, phone: true, whatsappEnabled: true } } },
    });

    if (!balance) return res.status(404).json({ error: 'No balance record found' });

    const player = balance.player;
    const amount = Math.abs(parseFloat(balance.balance));
    const owes = parseFloat(balance.balance) < 0;

    // Create in-app message
    await prisma.inboxMessage.create({
      data: {
        userId: playerId,
        title: owes ? 'Settlement Reminder' : 'Balance Update',
        body: customMessage || (owes
          ? `You have an outstanding balance of ${amount} points. Please settle at your convenience.`
          : `You have a credit balance of ${amount} points.`),
      }
    });

    // Send WhatsApp if enabled
    if (player.phone) {
      await sendSettlementReminder(player, amount, owes, req.user.displayName).catch(console.warn);
    }

    res.json({ message: 'Reminder sent', owes, amount });
  } catch (err) { next(err); }
});

// ─── SEND BALANCE SUMMARY (outside game) ─────────────────
router.post('/send-summary/:playerId', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { message: customMessage } = req.body;

    const balance = await prisma.rollingBalance.findUnique({
      where: { playerId_hostId: { playerId, hostId: req.user.id } },
      include: { player: true },
    });

    await prisma.inboxMessage.create({
      data: {
        userId: playerId,
        title: 'Balance Summary',
        body: customMessage || `Total buy-in: ${balance?.totalBuyIn || 0} pts | Total cash-out: ${balance?.totalCashOut || 0} pts | Balance: ${balance?.balance || 0} pts`,
      }
    });

    res.json({ message: 'Summary sent' });
  } catch (err) { next(err); }
});

module.exports = router;
