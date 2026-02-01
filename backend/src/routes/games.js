const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { requireGameHost, requireGameParticipant } = require('../middleware/auth');
const { sendGameInvitation } = require('../services/whatsapp');
const { broadcastGameUpdate, notifyGameStatus } = require('../services/websocket');
const ExcelJS = require('exceljs');

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
  body('maxRebuys').optional().isInt({ min: 0 }),
  body('playerIds').optional().isArray()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Game creation validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { playerIds, ...gameData } = req.body;

    console.log('Creating game:', { gameData, playerIds, hostId: req.user.id });

    const game = await prisma.game.create({
      data: {
        ...gameData,
        hostId: req.user.id,
        players: playerIds && playerIds.length > 0 ? {
          create: playerIds.map(playerId => ({
            playerId,
            initialBuyIn: gameData.buyInAmount,
            totalInvested: gameData.buyInAmount,
            status: 'INVITED'
          }))
        } : undefined
      },
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
        }
      }
    });

    res.status(201).json({ game });
  } catch (error) {
    console.error('Game creation error:', error);
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
        // Check if already invited or active
        const existing = await prisma.gamePlayer.findFirst({
          where: {
            gameId: game.id,
            playerId,
            status: { in: ['ACTIVE', 'INVITED'] }
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

/**
 * GET /api/games/:id/export
 * Export game data to Excel
 */
router.get('/:id/export', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Fetch complete game data
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        host: {
          select: { id: true, displayName: true, email: true }
        },
        players: {
          include: {
            player: {
              select: { id: true, displayName: true, email: true, phone: true }
            }
          },
          orderBy: { seatNumber: 'asc' }
        },
        transactions: {
          include: {
            player: {
              select: { displayName: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Verify access
    const isHost = game.hostId === userId;
    const isParticipant = game.players.some(p => p.playerId === userId);
    if (!isHost && !isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PokerLedger Pro';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Game Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    summarySheet.addRows([
      { field: 'Game Name', value: game.name },
      { field: 'Game Type', value: game.gameType },
      { field: 'Host', value: game.host.displayName },
      { field: 'Location', value: game.location || 'N/A' },
      { field: 'Start Time', value: game.startTime?.toLocaleString() || 'N/A' },
      { field: 'End Time', value: game.endTime?.toLocaleString() || 'N/A' },
      { field: 'Status', value: game.status },
      { field: 'Buy-in Amount', value: `${game.buyInAmount} points` },
      { field: 'Blinds', value: `${game.blindsSmall}/${game.blindsBig}` },
      { field: 'Rake %', value: `${game.rakePercentage}%` },
      { field: 'Float Amount', value: `${game.floatAmount || 0} points` },
      { field: 'Food Expense', value: `${game.foodExpense || 0} points` },
      { field: 'Rent Expense', value: `${game.rentExpense || 0} points` },
      { field: 'Dealer Expense', value: `${game.dealerExpense || 0} points` },
      { field: 'Misc Expense', value: `${game.miscExpense || 0} points` }
    ]);

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getColumn('field').font = { bold: true };

    // Players Sheet
    const playersSheet = workbook.addWorksheet('Players');
    playersSheet.columns = [
      { header: 'Seat', key: 'seat', width: 8 },
      { header: 'Player Name', key: 'name', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Buy-in', key: 'buyIn', width: 15 },
      { header: 'Total Invested', key: 'invested', width: 15 },
      { header: 'Cash Out', key: 'cashOut', width: 15 },
      { header: 'Profit/Loss', key: 'profitLoss', width: 15 },
      { header: 'Joined At', key: 'joinedAt', width: 20 }
    ];

    game.players.forEach(gp => {
      const profitLoss = gp.profitLoss || (gp.cashOut ? parseFloat(gp.cashOut) - parseFloat(gp.totalInvested) : 0);
      playersSheet.addRow({
        seat: gp.seatNumber || '-',
        name: gp.player.displayName,
        status: gp.status,
        buyIn: `${gp.initialBuyIn} pts`,
        invested: `${gp.totalInvested} pts`,
        cashOut: gp.cashOut ? `${gp.cashOut} pts` : '-',
        profitLoss: `${profitLoss >= 0 ? '+' : ''}${profitLoss} pts`,
        joinedAt: gp.joinedAt?.toLocaleString() || '-'
      });
    });

    playersSheet.getRow(1).font = { bold: true };

    // Transactions Sheet
    const transactionsSheet = workbook.addWorksheet('Transactions');
    transactionsSheet.columns = [
      { header: 'Time', key: 'time', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Player', key: 'player', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Payment Method', key: 'method', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    game.transactions.forEach(tx => {
      transactionsSheet.addRow({
        time: tx.createdAt?.toLocaleString() || '-',
        type: tx.type,
        player: tx.player.displayName,
        amount: `${tx.amount} pts`,
        method: tx.paymentMethod || '-',
        notes: tx.notes || '-'
      });
    });

    transactionsSheet.getRow(1).font = { bold: true };

    // Calculate totals
    const totalBuyIn = game.players.reduce((sum, p) => sum + parseFloat(p.totalInvested || 0), 0);
    const totalCashOut = game.players.reduce((sum, p) => sum + parseFloat(p.cashOut || 0), 0);
    const calculatedRake = totalBuyIn - totalCashOut;
    const expectedRake = (totalBuyIn * (game.rakePercentage / 100));

    // Reconciliation Sheet
    const reconSheet = workbook.addWorksheet('Reconciliation');
    reconSheet.columns = [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Amount', key: 'amount', width: 20 }
    ];

    reconSheet.addRows([
      { category: 'Total Buy-in', amount: `${totalBuyIn} pts` },
      { category: 'Total Cash-out', amount: `${totalCashOut} pts` },
      { category: 'Float Amount', amount: `${game.floatAmount || 0} pts` },
      { category: '', amount: '' },
      { category: 'Calculated Rake', amount: `${calculatedRake} pts` },
      { category: 'Expected Rake (' + game.rakePercentage + '%)', amount: `${expectedRake.toFixed(2)} pts` },
      { category: 'Difference', amount: `${(calculatedRake - expectedRake).toFixed(2)} pts` },
      { category: '', amount: '' },
      { category: 'Food Expense', amount: `${game.foodExpense || 0} pts` },
      { category: 'Rent Expense', amount: `${game.rentExpense || 0} pts` },
      { category: 'Dealer Expense', amount: `${game.dealerExpense || 0} pts` },
      { category: 'Misc Expense', amount: `${game.miscExpense || 0} pts` },
      { category: 'Total Expenses', amount: `${(parseFloat(game.foodExpense || 0) + parseFloat(game.rentExpense || 0) + parseFloat(game.dealerExpense || 0) + parseFloat(game.miscExpense || 0))} pts` },
      { category: '', amount: '' },
      { category: 'Net Rake (After Expenses)', amount: `${(calculatedRake - (parseFloat(game.foodExpense || 0) + parseFloat(game.rentExpense || 0) + parseFloat(game.dealerExpense || 0) + parseFloat(game.miscExpense || 0)))} pts` }
    ]);

    reconSheet.getRow(1).font = { bold: true };
    reconSheet.getColumn('category').font = { bold: true };

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=PokerGame_${game.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
