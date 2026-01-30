const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { notifyBuyIn, notifyTopUp, notifyCashOut } = require('../services/whatsapp');
const { notifyTransaction, broadcastGameUpdate } = require('../services/websocket');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/transactions/buy-in
 * Host records initial buy-in or re-buy for a player
 * Sends WhatsApp notification to player as courtesy
 */
router.post('/buy-in', [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').optional().isIn(['CASH', 'VENMO', 'PAYPAL', 'ZELLE', 'BANK_TRANSFER', 'OTHER']),
  body('sendNotification').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gameId, playerId, amount, paymentMethod = 'CASH', sendNotification = true } = req.body;

    // Verify user is game host
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          where: { playerId }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only host can record buy-ins' });
    }

    // Get player details
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, displayName: true, phone: true, email: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check if player exists in game
    let gamePlayer = game.players[0];
    const isFirstBuyIn = !gamePlayer;

    if (!gamePlayer) {
      // Add player to game with initial buy-in
      gamePlayer = await prisma.gamePlayer.create({
        data: {
          gameId,
          playerId,
          initialBuyIn: amount,
          totalInvested: amount,
          status: 'ACTIVE'
        }
      });
    } else {
      // Update existing player's investment (re-buy)
      gamePlayer = await prisma.gamePlayer.update({
        where: { id: gamePlayer.id },
        data: {
          totalInvested: { increment: parseFloat(amount) },
          status: gamePlayer.status === 'ELIMINATED' ? 'ACTIVE' : gamePlayer.status
        }
      });
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        gameId,
        playerId,
        type: isFirstBuyIn ? 'BUY_IN' : 'RE_BUY',
        amount,
        paymentMethod
      },
      include: {
        player: {
          select: { id: true, displayName: true, phone: true }
        }
      }
    });

    // Send WhatsApp notification to player (async, don't wait)
    if (sendNotification && player.phone) {
      notifyBuyIn(player, game, amount, !isFirstBuyIn).catch(err => {
        console.warn('WhatsApp notification failed:', err.message);
      });
    }

    // Broadcast to game room via WebSocket
    notifyTransaction(gameId, {
      ...transaction,
      gamePlayer: {
        totalInvested: gamePlayer.totalInvested,
        status: gamePlayer.status
      }
    });

    res.status(201).json({ 
      transaction, 
      gamePlayer,
      message: `${isFirstBuyIn ? 'Buy-in' : 'Re-buy'} recorded${sendNotification ? ' - player notified via WhatsApp' : ''}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transactions/top-up
 * Host records a top-up for a player (same as re-buy, clearer naming)
 * Sends WhatsApp notification to player
 */
router.post('/top-up', [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').optional().isIn(['CASH', 'VENMO', 'PAYPAL', 'ZELLE', 'BANK_TRANSFER', 'OTHER']),
  body('sendNotification').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gameId, playerId, amount, paymentMethod = 'CASH', sendNotification = true } = req.body;

    // Verify user is game host
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only host can record top-ups' });
    }

    // Get player and game player record
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, displayName: true, phone: true }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update player's total invested
    const gamePlayer = await prisma.gamePlayer.update({
      where: {
        gameId_playerId: { gameId, playerId }
      },
      data: {
        totalInvested: { increment: parseFloat(amount) },
        status: 'ACTIVE'
      }
    });

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        gameId,
        playerId,
        type: 'TOP_UP',
        amount,
        paymentMethod
      }
    });

    // Send WhatsApp notification
    if (sendNotification && player.phone) {
      notifyTopUp(player, game, amount, parseFloat(gamePlayer.totalInvested)).catch(err => {
        console.warn('WhatsApp notification failed:', err.message);
      });
    }

    // Broadcast update
    notifyTransaction(gameId, { ...transaction, gamePlayer });

    res.status(201).json({
      transaction,
      gamePlayer,
      message: `Top-up recorded${sendNotification ? ' - player notified via WhatsApp' : ''}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transactions/cash-out
 * Host records a player cash-out
 * Sends WhatsApp summary with profit/loss to player
 */
router.post('/cash-out', [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat({ min: 0 }),
  body('sendNotification').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gameId, playerId, amount, sendNotification = true } = req.body;

    // Verify user is game host
    const game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only host can record cash-outs' });
    }

    // Get current game player record
    const existingGamePlayer = await prisma.gamePlayer.findUnique({
      where: { gameId_playerId: { gameId, playerId } },
      include: {
        player: {
          select: { id: true, displayName: true, phone: true }
        }
      }
    });

    if (!existingGamePlayer) {
      return res.status(404).json({ error: 'Player not in this game' });
    }

    const totalInvested = parseFloat(existingGamePlayer.totalInvested);
    const profit = amount - totalInvested;

    // Update player status
    const gamePlayer = await prisma.gamePlayer.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: {
        cashOut: amount,
        finalBalance: profit,
        status: 'CASHED_OUT',
        leftAt: new Date()
      }
    });

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        gameId,
        playerId,
        type: 'CASH_OUT',
        amount
      },
      include: {
        player: {
          select: { id: true, displayName: true }
        }
      }
    });

    // Send WhatsApp notification with profit/loss summary
    if (sendNotification && existingGamePlayer.player?.phone) {
      notifyCashOut(
        existingGamePlayer.player, 
        game, 
        amount, 
        totalInvested
      ).catch(err => {
        console.warn('WhatsApp notification failed:', err.message);
      });
    }

    // Broadcast update
    notifyTransaction(gameId, { ...transaction, gamePlayer });

    res.json({
      transaction,
      gamePlayer,
      summary: {
        totalInvested,
        cashOut: amount,
        profit
      },
      message: `Cash-out recorded${sendNotification ? ' - player notified via WhatsApp' : ''}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transactions/adjustment
 * Host makes a balance adjustment (correction)
 */
router.post('/adjustment', [
  body('gameId').isUUID(),
  body('playerId').isUUID(),
  body('amount').isFloat(),
  body('reason').trim().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { gameId, playerId, amount, reason } = req.body;

    const game = await prisma.game.findUnique({ where: { id: gameId } });

    if (!game || game.hostId !== req.user.id) {
      return res.status(403).json({ error: 'Only host can make adjustments' });
    }

    // Update player's total invested
    const gamePlayer = await prisma.gamePlayer.update({
      where: { gameId_playerId: { gameId, playerId } },
      data: {
        totalInvested: { increment: parseFloat(amount) }
      }
    });

    // Create adjustment transaction
    const transaction = await prisma.transaction.create({
      data: {
        gameId,
        playerId,
        type: 'ADJUSTMENT',
        amount: Math.abs(amount),
        notes: `${amount >= 0 ? '+' : '-'}$${Math.abs(amount).toFixed(2)}: ${reason}`
      }
    });

    notifyTransaction(gameId, transaction);

    res.json({
      transaction,
      gamePlayer,
      message: 'Adjustment recorded'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/transactions/game/:gameId
 * Get all transactions for a game
 */
router.get('/game/:gameId', async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { type, playerId, limit = 100 } = req.query;

    const where = { gameId };
    if (type) where.type = type;
    if (playerId) where.playerId = playerId;

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        player: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/transactions/player/:playerId
 * Get transaction history for a player
 */
router.get('/player/:playerId', async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { limit = 50 } = req.query;

    const transactions = await prisma.transaction.findMany({
      where: { playerId },
      include: {
        game: {
          select: { id: true, name: true, gameType: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
