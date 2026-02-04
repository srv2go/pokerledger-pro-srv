const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { requireMinRole, canSeeRake, checkSubscription } = require('../middleware/auth');
const { broadcastGameUpdate } = require('../services/websocket');
const { sendGameInvitation } = require('../services/messaging');

const router = express.Router();
const prisma = new PrismaClient();

// Strip rake from game if user is player
const sanitizeGame = (game, user) => {
  if (!canSeeRake(user)) {
    const { rakePercentage, ...rest } = game;
    return rest;
  }
  return game;
};

// ─── LIST GAMES ──────────────────────────────────────────
router.get('/', checkSubscription, async (req, res, next) => {
  try {
    const { status } = req.query;
    const user = req.user;
    const where = {};

    if (status) where.status = status;

    // Role-based filtering
    if (user.role === 'PLAYER') {
      where.players = { some: { playerId: user.id } };
    } else if (user.role === 'HOST') {
      where.hostId = user.id;
    } else if (user.role === 'ADMIN') {
      // Admin sees own games + managed hosts' games
      where.OR = [
        { hostId: user.id },
        { host: { managedById: user.id } },
      ];
    }
    // SUPER_ADMIN sees all

    let games = await prisma.game.findMany({
      where,
      include: {
        host: { select: { id: true, displayName: true } },
        players: { include: { player: { select: { id: true, displayName: true, phone: true } } } },
        _count: { select: { players: true, transactions: true } }
      },
      orderBy: { startTime: 'desc' },
      ...(req.gameLimit ? { take: req.gameLimit } : {}),
    });

    games = games.map(g => sanitizeGame(g, user));
    res.json({ games });
  } catch (err) { next(err); }
});

// ─── GET GAME ────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    let game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, displayName: true, phone: true } },
        players: {
          include: { player: { select: { id: true, displayName: true, phone: true, whatsappEnabled: true } } },
          orderBy: { joinedAt: 'asc' }
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50, include: { player: { select: { id: true, displayName: true } } } },
        gameFloats: { orderBy: { createdAt: 'desc' } },
        expenses: { orderBy: { createdAt: 'desc' } },
      }
    });

    if (!game) return res.status(404).json({ error: 'Game not found' });

    game = sanitizeGame(game, req.user);

    const activePlayers = game.players.filter(p => p.status === 'ACTIVE');
    const totalBuyIns = game.players.reduce((s, p) => s + parseFloat(p.totalInvested || 0), 0);
    const totalCashOuts = game.players.filter(p => p.cashOut !== null).reduce((s, p) => s + parseFloat(p.cashOut || 0), 0);
    const totalFloat = game.gameFloats?.reduce((s, f) => s + parseFloat(f.amount), 0) || 0;
    const totalExpenses = game.expenses?.reduce((s, e) => s + parseFloat(e.amount), 0) || 0;

    const isHost = game.hostId === req.user.id || ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);

    const stats = {
      totalPot: totalBuyIns,
      totalCashOuts,
      totalFloat,
      totalExpenses,
      activePlayers: activePlayers.length,
      averageStack: activePlayers.length > 0 ? totalBuyIns / activePlayers.length : 0,
      rake: canSeeRake(req.user) ? (totalBuyIns + totalFloat) - totalCashOuts - totalExpenses : undefined,
      // Tally: (float + player buyins) - cashouts = rake
      tallyCheck: canSeeRake(req.user) ? {
        floatPlusBuyIns: totalFloat + totalBuyIns,
        cashOuts: totalCashOuts,
        expenses: totalExpenses,
        expectedRake: (totalFloat + totalBuyIns) - totalCashOuts - totalExpenses,
      } : undefined,
    };

    res.json({ game, stats, isHost });
  } catch (err) { next(err); }
});

// ─── CREATE GAME ─────────────────────────────────────────
router.post('/', requireMinRole('HOST'), [
  body('name').trim().notEmpty(),
  body('buyInAmount').isFloat({ min: 0 }),
  body('gameType').optional().isIn(['TEXAS_HOLDEM', 'OMAHA', 'OMAHA_HI_LO', 'MIXED']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, gameType = 'TEXAS_HOLDEM', buyInAmount, blindsSmall, blindsBig,
            anteAmount, rakePercentage = 0, rebuyPolicy = 'UNLIMITED', maxRebuys,
            location, startTime, notes } = req.body;

    const game = await prisma.game.create({
      data: {
        hostId: req.user.id, name, gameType, buyInAmount, location,
        blindsSmall: blindsSmall || null, blindsBig: blindsBig || null,
        anteAmount: anteAmount || null, rakePercentage,
        rebuyPolicy, maxRebuys, notes,
        startTime: startTime ? new Date(startTime) : new Date(),
      },
      include: { host: { select: { id: true, displayName: true } } }
    });

    res.status(201).json({ game });
  } catch (err) { next(err); }
});

// ─── UPDATE GAME ─────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.hostId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.game.update({ where: { id: req.params.id }, data: req.body });
    res.json({ game: updated });
  } catch (err) { next(err); }
});

// ─── START/PAUSE/RESUME/END ──────────────────────────────
const statusAction = (action) => async (req, res, next) => {
  try {
    const game = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.hostId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const statusMap = { start: 'ACTIVE', pause: 'PAUSED', resume: 'ACTIVE', end: 'COMPLETED' };
    const data = { status: statusMap[action] };
    if (action === 'end') data.endTime = new Date();

    const updated = await prisma.game.update({ where: { id: req.params.id }, data });
    broadcastGameUpdate(req.params.id, { status: updated.status });

    // On game end, update rolling balances
    if (action === 'end') {
      await updateRollingBalances(req.params.id, game.hostId);
    }

    res.json({ game: updated });
  } catch (err) { next(err); }
};

router.post('/:id/start', statusAction('start'));
router.post('/:id/pause', statusAction('pause'));
router.post('/:id/resume', statusAction('resume'));
router.post('/:id/end', statusAction('end'));

// ─── ADD FLOAT ───────────────────────────────────────────
router.post('/:id/float', requireMinRole('HOST'), [
  body('amount').isFloat({ min: 0.01 }),
], async (req, res, next) => {
  try {
    const { amount, notes } = req.body;
    const gameFloat = await prisma.gameFloat.create({
      data: { gameId: req.params.id, amount, notes }
    });
    broadcastGameUpdate(req.params.id, { newFloat: gameFloat });
    res.status(201).json({ float: gameFloat });
  } catch (err) { next(err); }
});

// ─── ADD EXPENSE ─────────────────────────────────────────
router.post('/:id/expense', requireMinRole('HOST'), [
  body('category').isIn(['FOOD', 'RENT', 'DEALER', 'MISC']),
  body('amount').isFloat({ min: 0 }),
], async (req, res, next) => {
  try {
    const { category, amount, notes } = req.body;
    const expense = await prisma.expense.create({
      data: { gameId: req.params.id, category, amount, notes }
    });
    broadcastGameUpdate(req.params.id, { newExpense: expense });
    res.status(201).json({ expense });
  } catch (err) { next(err); }
});

// ─── TABLE CASH-OUT (all remaining players at once) ──────
router.post('/:id/table-cashout', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const { cashOuts, expenses: expenseItems } = req.body;
    // cashOuts: [{ playerId, amount }]
    // expenses: [{ category, amount, notes }]

    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: { players: true }
    });

    if (!game) return res.status(404).json({ error: 'Game not found' });

    const results = [];

    // Process each player cash-out
    for (const co of cashOuts) {
      const gp = game.players.find(p => p.playerId === co.playerId);
      if (!gp || gp.status === 'CASHED_OUT') continue;

      const totalInvested = parseFloat(gp.totalInvested);
      const profit = co.amount - totalInvested;

      await prisma.gamePlayer.update({
        where: { id: gp.id },
        data: { cashOut: co.amount, finalBalance: profit, status: 'CASHED_OUT', leftAt: new Date() }
      });

      await prisma.transaction.create({
        data: { gameId: game.id, playerId: co.playerId, type: 'CASH_OUT', amount: co.amount, session: gp.session }
      });

      results.push({ playerId: co.playerId, cashOut: co.amount, profit });
    }

    // Process expenses
    if (expenseItems?.length) {
      for (const exp of expenseItems) {
        await prisma.expense.create({
          data: { gameId: game.id, category: exp.category, amount: exp.amount, notes: exp.notes }
        });
      }
    }

    res.json({ results, message: 'Table cash-out complete' });
  } catch (err) { next(err); }
});

// ─── INVITE PLAYERS ──────────────────────────────────────
router.post('/:id/invite', async (req, res, next) => {
  try {
    const { playerIds, sendNotification = true } = req.body;
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: { host: { select: { id: true, displayName: true } } }
    });

    if (!game) return res.status(404).json({ error: 'Game not found' });

    for (const playerId of playerIds) {
      const existing = await prisma.gamePlayer.findUnique({
        where: { gameId_playerId: { gameId: game.id, playerId } }
      });
      if (!existing) {
        await prisma.gamePlayer.create({
          data: { gameId: game.id, playerId, initialBuyIn: 0, totalInvested: 0, status: 'INVITED' }
        });
      }
      if (sendNotification) {
        const player = await prisma.user.findUnique({ where: { id: playerId } });
        if (player?.phone) {
          sendGameInvitation(player, game, game.host).catch(console.warn);
        }
      }
    }

    res.json({ message: `${playerIds.length} players invited` });
  } catch (err) { next(err); }
});

// ─── DELETE GAME ─────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.game.delete({ where: { id: req.params.id } });
    res.json({ message: 'Game deleted' });
  } catch (err) { next(err); }
});

// ─── UPDATE ROLLING BALANCES (called on game end) ────────
async function updateRollingBalances(gameId, hostId) {
  const players = await prisma.gamePlayer.findMany({
    where: { gameId },
    include: { player: true }
  });

  for (const gp of players) {
    const totalIn = parseFloat(gp.totalInvested || 0);
    const totalOut = parseFloat(gp.cashOut || 0);

    await prisma.rollingBalance.upsert({
      where: { playerId_hostId: { playerId: gp.playerId, hostId } },
      create: {
        playerId: gp.playerId, hostId,
        totalBuyIn: totalIn, totalCashOut: totalOut,
        balance: totalOut - totalIn, lastGameId: gameId,
      },
      update: {
        totalBuyIn: { increment: totalIn },
        totalCashOut: { increment: totalOut },
        balance: { increment: totalOut - totalIn },
        lastGameId: gameId,
      }
    });
  }
}

module.exports = router;
