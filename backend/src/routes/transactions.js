const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { requireMinRole } = require('../middleware/auth');
const { notifyBuyIn, notifyTopUp, notifyCashOut } = require('../services/messaging');
const { notifyTransaction, broadcastGameUpdate } = require('../services/websocket');

const router = express.Router();
const prisma = new PrismaClient();

// ─── BUY-IN (initial or re-buy, supports rejoin) ────────
router.post('/buy-in', [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').optional().isIn(['CASH', 'VENMO', 'PAYPAL', 'ZELLE', 'BANK_TRANSFER', 'OTHER']),
  body('sendNotification').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { gameId, playerId, amount, paymentMethod = 'CASH', sendNotification = true } = req.body;

    const game = await prisma.game.findUnique({ where: { id: gameId }, include: { players: { where: { playerId } } } });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.hostId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only host can record buy-ins' });
    }

    const player = await prisma.user.findUnique({ where: { id: playerId }, select: { id: true, displayName: true, phone: true, whatsappEnabled: true } });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    let gamePlayer = game.players[0];
    let isRejoin = false;
    let isFirstBuyIn = !gamePlayer;

    if (!gamePlayer) {
      // Brand new player in this game
      gamePlayer = await prisma.gamePlayer.create({
        data: { gameId, playerId, initialBuyIn: amount, totalInvested: amount, status: 'ACTIVE', session: 1 }
      });
    } else if (gamePlayer.status === 'CASHED_OUT') {
      // REJOIN: Player cashed out earlier and is rejoining
      isRejoin = true;
      isFirstBuyIn = false;
      const newSession = gamePlayer.session + 1;
      gamePlayer = await prisma.gamePlayer.update({
        where: { id: gamePlayer.id },
        data: {
          totalInvested: { increment: parseFloat(amount) },
          cashOut: null,           // Reset cashout for new session
          finalBalance: null,
          status: 'ACTIVE',
          leftAt: null,
          session: newSession,
        }
      });
    } else {
      // Regular re-buy / top-up for active player
      isFirstBuyIn = false;
      gamePlayer = await prisma.gamePlayer.update({
        where: { id: gamePlayer.id },
        data: {
          totalInvested: { increment: parseFloat(amount) },
          status: gamePlayer.status === 'ELIMINATED' ? 'ACTIVE' : gamePlayer.status,
        }
      });
    }

    const txType = isFirstBuyIn ? 'BUY_IN' : (isRejoin ? 'RE_BUY' : 'RE_BUY');

    const transaction = await prisma.transaction.create({
      data: { gameId, playerId, type: txType, amount, paymentMethod, session: gamePlayer.session },
      include: { player: { select: { id: true, displayName: true, phone: true } } }
    });

    // WhatsApp notification
    if (sendNotification && player?.phone) {
      notifyBuyIn(player, game, amount, !isFirstBuyIn).catch(console.warn);
    }

    notifyTransaction(gameId, { ...transaction, gamePlayer: { totalInvested: gamePlayer.totalInvested, status: gamePlayer.status, session: gamePlayer.session } });

    res.status(201).json({
      transaction, gamePlayer, isRejoin,
      message: `${isRejoin ? 'Rejoin' : isFirstBuyIn ? 'Buy-in' : 'Re-buy'} recorded`
    });
  } catch (err) { next(err); }
});

// ─── TOP-UP ──────────────────────────────────────────────
router.post('/top-up', [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('sendNotification').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { gameId, playerId, amount, paymentMethod = 'CASH', sendNotification = true } = req.body;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.hostId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only host can record top-ups' });
    }

    const player = await prisma.user.findUnique({ where: { id: playerId }, select: { id: true, displayName: true, phone: true, whatsappEnabled: true } });

    const gamePlayer = await prisma.gamePlayer.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: { totalInvested: { increment: parseFloat(amount) }, status: 'ACTIVE' }
    });

    const transaction = await prisma.transaction.create({
      data: { gameId, playerId, type: 'TOP_UP', amount, paymentMethod, session: gamePlayer.session }
    });

    if (sendNotification && player?.phone) {
      notifyTopUp(player, game, amount, parseFloat(gamePlayer.totalInvested)).catch(console.warn);
    }

    notifyTransaction(gameId, { ...transaction, gamePlayer });
    res.status(201).json({ transaction, gamePlayer });
  } catch (err) { next(err); }
});

// ─── CASH-OUT (individual, supports flexible/owed amounts) ─
router.post('/cash-out', [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat({ min: 0 }),
  body('sendNotification').optional().isBoolean(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { gameId, playerId, amount, sendNotification = true } = req.body;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.hostId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only host can record cash-outs' });
    }

    const existing = await prisma.gamePlayer.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
      include: { player: { select: { id: true, displayName: true, phone: true, whatsappEnabled: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Player not in game' });

    const totalInvested = parseFloat(existing.totalInvested);
    const profit = amount - totalInvested;

    // Allow any amount including 0 (player owes host) - flexible checkout
    const gamePlayer = await prisma.gamePlayer.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: { cashOut: amount, finalBalance: profit, status: 'CASHED_OUT', leftAt: new Date() }
    });

    const transaction = await prisma.transaction.create({
      data: { gameId, playerId, type: 'CASH_OUT', amount, session: existing.session }
    });

    if (sendNotification && existing.player?.phone) {
      notifyCashOut(existing.player, game, amount, totalInvested).catch(console.warn);
    }

    notifyTransaction(gameId, { ...transaction, gamePlayer });
    res.json({ transaction, gamePlayer, summary: { totalInvested, cashOut: amount, profit } });
  } catch (err) { next(err); }
});

// ─── ADJUSTMENT ──────────────────────────────────────────
router.post('/adjustment', requireMinRole('HOST'), [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat(),
  body('reason').trim().notEmpty(),
], async (req, res, next) => {
  try {
    const { gameId, playerId, amount, reason } = req.body;
    const gamePlayer = await prisma.gamePlayer.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: { totalInvested: { increment: parseFloat(amount) } }
    });
    const transaction = await prisma.transaction.create({
      data: { gameId, playerId, type: 'ADJUSTMENT', amount: Math.abs(amount), notes: `${amount >= 0 ? '+' : '-'}${Math.abs(amount)}: ${reason}`, session: gamePlayer.session }
    });
    notifyTransaction(gameId, transaction);
    res.json({ transaction, gamePlayer });
  } catch (err) { next(err); }
});

// ─── EDIT TRANSACTION (host can edit past results) ───────
router.put('/:txId', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const { amount, notes } = req.body;
    const tx = await prisma.transaction.update({
      where: { id: req.params.txId },
      data: { ...(amount !== undefined && { amount }), ...(notes !== undefined && { notes }) }
    });

    // Recalculate gamePlayer totals
    if (amount !== undefined) {
      const allTx = await prisma.transaction.findMany({ where: { gameId: tx.gameId, playerId: tx.playerId } });
      const totalInvested = allTx.filter(t => ['BUY_IN', 'RE_BUY', 'TOP_UP'].includes(t.type)).reduce((s, t) => s + parseFloat(t.amount), 0);
      const lastCashOut = allTx.filter(t => t.type === 'CASH_OUT').sort((a, b) => b.createdAt - a.createdAt)[0];

      await prisma.gamePlayer.update({
        where: { gameId_playerId: { gameId: tx.gameId, playerId: tx.playerId } },
        data: {
          totalInvested,
          ...(lastCashOut ? { cashOut: parseFloat(lastCashOut.amount), finalBalance: parseFloat(lastCashOut.amount) - totalInvested } : {})
        }
      });
    }

    res.json({ transaction: tx });
  } catch (err) { next(err); }
});

// ─── GET GAME TRANSACTIONS ───────────────────────────────
router.get('/game/:gameId', async (req, res, next) => {
  try {
    const { type, playerId } = req.query;
    const where = { gameId: req.params.gameId };
    if (type) where.type = type;
    if (playerId) where.playerId = playerId;

    const transactions = await prisma.transaction.findMany({
      where,
      include: { player: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ transactions });
  } catch (err) { next(err); }
});

// ─── GET PLAYER TRANSACTIONS ─────────────────────────────
router.get('/player/:playerId', async (req, res, next) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { playerId: req.params.playerId },
      include: { game: { select: { id: true, name: true, gameType: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ transactions });
  } catch (err) { next(err); }
});

module.exports = router;
