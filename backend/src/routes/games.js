const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { requireGameHost, requireGameParticipant } = require('../middleware/auth');
const { sendGameInvitation } = require('../services/whatsapp');
const { broadcastGameUpdate, notifyGameStatus } = require('../services/websocket');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/games
 * List games for current user
 */
router.get('/', [
  query('status').optional().isIn(['SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    const where = {
      OR: [
        { hostId: userId },
        { players: { some: { playerId: userId } } }
      ]
    };

    if (status) {
      where.status = status;
    }

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        include: {
          host: {
            select: { id: true, displayName: true, avatarUrl: true }
          },
          players: {
            include: {
              player: {
                select: { id: true, displayName: true, avatarUrl: true }
              }
            }
          },
          _count: {
            select: { transactions: true, topUpRequests: true }
          }
        },
        orderBy: { startTime: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.game.count({ where })
    ]);

    // Calculate totals for each game
    const gamesWithStats = games.map(game => {
      const totalPot = game.players.reduce((sum, p) => 
        sum + parseFloat(p.totalInvested || 0), 0
      );
      const activePlayers = game.players.filter(p => 
        ['ACTIVE', 'SITTING_OUT'].includes(p.status)
      ).length;

      return {
        ...game,
        stats: {
          totalPot,
          activePlayers,
          totalPlayers: game.players.length
        }
      };
    });

    res.json({
      games: gamesWithStats,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games
 * Create a new game
 */
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('gameType').isIn(['TEXAS_HOLDEM', 'OMAHA', 'OMAHA_HI_LO', 'MIXED']),
  body('startTime').isISO8601(),
  body('buyInAmount').isFloat({ min: 0 }),
  body('location').optional().trim(),
  body('blindsSmall').optional().isFloat({ min: 0 }),
  body('blindsBig').optional().isFloat({ min: 0 }),
  body('anteAmount').optional().isFloat({ min: 0 }),
  body('rakePercentage').optional().isFloat({ min: 0, max: 100 }),
  body('rebuyPolicy').optional().isIn(['UNLIMITED', 'CAPPED', 'TIME_LIMITED', 'NONE']),
  body('maxRebuys').optional().isInt({ min: 0 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const game = await prisma.game.create({
      data: {
        ...req.body,
        hostId: req.user.id
      },
      include: {
        host: {
          select: { id: true, displayName: true, avatarUrl: true }
        }
      }
    });

    res.status(201).json({ game });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/games/:id
 * Get game details
 */
router.get('/:id', requireGameParticipant, async (req, res, next) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: {
        host: {
          select: { id: true, displayName: true, avatarUrl: true, phone: true }
        },
        players: {
          include: {
            player: {
              select: { id: true, displayName: true, avatarUrl: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        topUpRequests: {
          where: { status: 'PENDING' },
          include: {
            player: {
              select: { id: true, displayName: true }
            }
          }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Calculate game statistics
    const stats = calculateGameStats(game);

    res.json({ game, stats, isHost: req.isHost });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/games/:id
 * Update game details
 */
router.put('/:id', requireGameHost, [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('location').optional().trim(),
  body('startTime').optional().isISO8601(),
  body('buyInAmount').optional().isFloat({ min: 0 }),
  body('blindsSmall').optional().isFloat({ min: 0 }),
  body('blindsBig').optional().isFloat({ min: 0 }),
  body('notes').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const game = await prisma.game.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        host: {
          select: { id: true, displayName: true }
        }
      }
    });

    broadcastGameUpdate(game.id, 'GAME_UPDATED', game);

    res.json({ game });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:id/start
 * Start a game
 */
router.post('/:id/start', requireGameHost, async (req, res, next) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Game cannot be started from current status' });
    }

    const updatedGame = await prisma.game.update({
      where: { id: req.params.id },
      data: { 
        status: 'ACTIVE',
        startTime: new Date()
      },
      include: {
        players: {
          include: {
            player: { select: { id: true, displayName: true } }
          }
        }
      }
    });

    notifyGameStatus(game.id, 'ACTIVE', { startTime: updatedGame.startTime });

    res.json({ game: updatedGame, message: 'Game started' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:id/pause
 * Pause a game
 */
router.post('/:id/pause', requireGameHost, async (req, res, next) => {
  try {
    const game = await prisma.game.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' }
    });

    notifyGameStatus(game.id, 'PAUSED');

    res.json({ game, message: 'Game paused' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:id/resume
 * Resume a paused game
 */
router.post('/:id/resume', requireGameHost, async (req, res, next) => {
  try {
    const game = await prisma.game.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' }
    });

    notifyGameStatus(game.id, 'ACTIVE');

    res.json({ game, message: 'Game resumed' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:id/end
 * End a game
 */
router.post('/:id/end', requireGameHost, async (req, res, next) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: {
        players: true,
        transactions: true
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Calculate final balances for all players
    const playerBalances = [];
    for (const gp of game.players) {
      const invested = parseFloat(gp.totalInvested || 0);
      const cashOut = parseFloat(gp.cashOut || 0);
      const balance = cashOut - invested;

      playerBalances.push({
        playerId: gp.playerId,
        invested,
        cashOut,
        balance
      });

      await prisma.gamePlayer.update({
        where: { id: gp.id },
        data: {
          finalBalance: balance,
          status: gp.status === 'ACTIVE' ? 'CASHED_OUT' : gp.status,
          leftAt: gp.leftAt || new Date()
        }
      });
    }

    const updatedGame = await prisma.game.update({
      where: { id: req.params.id },
      data: { 
        status: 'COMPLETED',
        endTime: new Date()
      },
      include: {
        players: {
          include: {
            player: { select: { id: true, displayName: true } }
          }
        }
      }
    });

    notifyGameStatus(game.id, 'COMPLETED', { 
      endTime: updatedGame.endTime,
      summary: playerBalances
    });

    res.json({ 
      game: updatedGame, 
      summary: playerBalances,
      message: 'Game ended' 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/games/:id
 * Cancel a game
 */
router.delete('/:id', requireGameHost, async (req, res, next) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot cancel an active game. End it first.' });
    }

    await prisma.game.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    notifyGameStatus(game.id, 'CANCELLED');

    res.json({ message: 'Game cancelled' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/games/:id/invite
 * Invite players to a game
 */
router.post('/:id/invite', requireGameHost, [
  body('playerIds').isArray({ min: 1 }),
  body('sendNotification').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { playerIds, sendNotification = true } = req.body;
    const game = await prisma.game.findUnique({
      where: { id: req.params.id }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const results = [];

    for (const playerId of playerIds) {
      try {
        // Check if already invited
        const existing = await prisma.gamePlayer.findUnique({
          where: {
            gameId_playerId: {
              gameId: game.id,
              playerId
            }
          }
        });

        if (existing) {
          results.push({ playerId, status: 'already_invited' });
          continue;
        }

        // Create game player record
        await prisma.gamePlayer.create({
          data: {
            gameId: game.id,
            playerId,
            initialBuyIn: game.buyInAmount,
            status: 'INVITED'
          }
        });

        // Send WhatsApp invitation
        if (sendNotification) {
          try {
            await sendGameInvitation(playerId, game);
            results.push({ playerId, status: 'invited', notified: true });
          } catch (notifyError) {
            results.push({ playerId, status: 'invited', notified: false, error: notifyError.message });
          }
        } else {
          results.push({ playerId, status: 'invited', notified: false });
        }
      } catch (error) {
        results.push({ playerId, status: 'error', error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate game statistics
 */
function calculateGameStats(game) {
  const players = game.players || [];
  const transactions = game.transactions || [];

  const totalPot = players.reduce((sum, p) => sum + parseFloat(p.totalInvested || 0), 0);
  const totalCashOut = players.reduce((sum, p) => sum + parseFloat(p.cashOut || 0), 0);
  const activePlayers = players.filter(p => ['ACTIVE', 'SITTING_OUT'].includes(p.status)).length;
  const rakeAmount = totalPot * (parseFloat(game.rakePercentage) / 100);

  const buyIns = transactions.filter(t => t.type === 'BUY_IN').length;
  const rebuys = transactions.filter(t => ['RE_BUY', 'TOP_UP'].includes(t.type)).length;

  return {
    totalPot,
    totalCashOut,
    activePlayers,
    totalPlayers: players.length,
    averageStack: activePlayers > 0 ? totalPot / activePlayers : 0,
    rakeAmount,
    buyInCount: buyIns,
    rebuyCount: rebuys
  };
}

module.exports = router;
