const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/players
 * List all players (for host to select when creating games)
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, limit = 50 } = req.query;

    const where = {
      role: { in: ['PLAYER', 'HOST'] }
    };

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const players = await prisma.user.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        paymentMethods: true,
        _count: {
          select: { gameParticipations: true }
        }
      },
      take: parseInt(limit),
      orderBy: { displayName: 'asc' }
    });

    res.json({ players });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/players
 * Create a new player (guest or regular)
 */
router.post('/', [
  body('displayName').trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('role').optional().isIn(['PLAYER', 'GUEST'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, email, phone, role = 'PLAYER' } = req.body;

    // Check for existing user with same email
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const player = await prisma.user.create({
      data: {
        displayName,
        email: email || `guest_${Date.now()}@pokerledger.local`,
        phone,
        role
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        role: true
      }
    });

    res.status(201).json({ player });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/players/:id
 * Get player details with stats
 */
router.get('/:id', async (req, res, next) => {
  try {
    const player = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        paymentMethods: true,
        createdAt: true,
        gameParticipations: {
          include: {
            game: {
              select: {
                id: true,
                name: true,
                gameType: true,
                startTime: true,
                status: true
              }
            }
          },
          orderBy: { joinedAt: 'desc' },
          take: 20
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Calculate lifetime stats
    const allParticipations = await prisma.gamePlayer.findMany({
      where: { playerId: req.params.id },
      select: {
        totalInvested: true,
        cashOut: true,
        finalBalance: true
      }
    });

    const stats = {
      totalGames: allParticipations.length,
      totalInvested: allParticipations.reduce((sum, p) => sum + parseFloat(p.totalInvested || 0), 0),
      totalCashOut: allParticipations.reduce((sum, p) => sum + parseFloat(p.cashOut || 0), 0),
      totalProfit: allParticipations.reduce((sum, p) => sum + parseFloat(p.finalBalance || 0), 0),
      profitableGames: allParticipations.filter(p => parseFloat(p.finalBalance || 0) > 0).length
    };

    stats.winRate = stats.totalGames > 0 
      ? ((stats.profitableGames / stats.totalGames) * 100).toFixed(1) 
      : 0;

    res.json({ player, stats });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/players/:id
 * Update player details
 */
router.put('/:id', [
  body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().isMobilePhone(),
  body('paymentMethods').optional().isArray()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, phone, paymentMethods } = req.body;
    const updateData = {};

    if (displayName) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (paymentMethods) updateData.paymentMethods = paymentMethods;

    const player = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        email: true,
        phone: true,
        paymentMethods: true
      }
    });

    res.json({ player });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/players/:id/history
 * Get player's game history with detailed stats
 */
router.get('/:id/history', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const [history, total] = await Promise.all([
      prisma.gamePlayer.findMany({
        where: { playerId: req.params.id },
        include: {
          game: {
            select: {
              id: true,
              name: true,
              gameType: true,
              startTime: true,
              endTime: true,
              status: true,
              buyInAmount: true,
              host: {
                select: { displayName: true }
              }
            }
          }
        },
        orderBy: { joinedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.gamePlayer.count({ where: { playerId: req.params.id } })
    ]);

    const historyWithStats = history.map(h => ({
      ...h,
      profit: parseFloat(h.cashOut || 0) - parseFloat(h.totalInvested || 0)
    }));

    res.json({
      history: historyWithStats,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
