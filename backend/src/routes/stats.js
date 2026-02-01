const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireMinRole, checkSubscription, FREE_GAME_LIMIT, canSeeRake } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ─── HOST STATS DASHBOARD (grid view of all players) ─────
router.get('/host-dashboard', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const hostId = req.user.id;

    // Get all games hosted
    const games = await prisma.game.findMany({
      where: { hostId, status: { in: ['COMPLETED', 'ACTIVE'] } },
      include: {
        players: {
          include: { player: { select: { id: true, displayName: true, phone: true, email: true } } }
        },
        expenses: true,
        floats: true,
      },
      orderBy: { startTime: 'desc' },
    });

    // Aggregate player stats across all games
    const playerMap = {};
    for (const game of games) {
      for (const gp of game.players) {
        const pid = gp.playerId;
        if (!playerMap[pid]) {
          playerMap[pid] = {
            id: pid,
            displayName: gp.player.displayName,
            phone: gp.player.phone,
            email: gp.player.email,
            totalGames: 0,
            totalBuyIn: 0,
            totalCashOut: 0,
            totalProfit: 0,
            gamesData: [],
          };
        }
        playerMap[pid].totalGames++;
        playerMap[pid].totalBuyIn += parseFloat(gp.totalInvested || 0);
        playerMap[pid].totalCashOut += parseFloat(gp.cashOut || 0);
        playerMap[pid].totalProfit += parseFloat(gp.finalBalance || 0);
        playerMap[pid].gamesData.push({
          gameId: game.id, gameName: game.name,
          buyIn: parseFloat(gp.totalInvested || 0),
          cashOut: parseFloat(gp.cashOut || 0),
          profit: parseFloat(gp.finalBalance || 0),
          date: game.startTime,
        });
      }
    }

    // Rolling balances
    const balances = await prisma.rollingBalance.findMany({
      where: { hostId },
      include: { player: { select: { id: true, displayName: true } } }
    });

    const balanceMap = {};
    for (const b of balances) {
      balanceMap[b.playerId] = parseFloat(b.balance);
    }

    // Merge
    const playerStats = Object.values(playerMap).map(p => ({
      ...p,
      rollingBalance: balanceMap[p.id] || 0,
      owesHost: (balanceMap[p.id] || 0) < 0,
      outstandingAmount: Math.abs(Math.min(0, balanceMap[p.id] || 0)),
    }));

    // Game summaries
    const gameSummaries = games.map(g => {
      const totalBuyIn = g.players.reduce((s, p) => s + parseFloat(p.totalInvested || 0), 0);
      const totalCashOut = g.players.reduce((s, p) => s + parseFloat(p.cashOut || 0), 0);
      const totalFloat = g.floats.reduce((s, f) => s + parseFloat(f.amount), 0);
      const totalExpenses = g.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

      return {
        id: g.id, name: g.name, gameType: g.gameType, status: g.status,
        date: g.startTime, endTime: g.endTime,
        playerCount: g.players.length, totalBuyIn, totalCashOut,
        ...(canSeeRake(req.user) ? {
          totalFloat, totalExpenses,
          rake: (totalFloat + totalBuyIn) - totalCashOut - totalExpenses,
        } : {}),
      };
    });

    res.json({ playerStats, gameSummaries, totalGames: games.length });
  } catch (err) { next(err); }
});

// ─── PLAYER PERSONAL STATS ──────────────────────────────
router.get('/my-stats', checkSubscription, async (req, res, next) => {
  try {
    const playerId = req.user.id;

    const games = await prisma.gamePlayer.findMany({
      where: { playerId },
      include: { game: { select: { id: true, name: true, gameType: true, startTime: true, endTime: true, status: true } } },
      orderBy: { joinedAt: 'desc' },
      ...(req.gameLimit ? { take: req.gameLimit } : {}),
    });

    const stats = {
      totalGames: games.length,
      totalBuyIn: games.reduce((s, g) => s + parseFloat(g.totalInvested || 0), 0),
      totalCashOut: games.reduce((s, g) => s + parseFloat(g.cashOut || 0), 0),
      totalProfit: games.reduce((s, g) => s + parseFloat(g.finalBalance || 0), 0),
      winRate: games.length > 0 ? (games.filter(g => parseFloat(g.finalBalance || 0) > 0).length / games.length * 100) : 0,
      biggestWin: Math.max(0, ...games.map(g => parseFloat(g.finalBalance || 0))),
      biggestLoss: Math.min(0, ...games.map(g => parseFloat(g.finalBalance || 0))),
    };

    res.json({ games, stats, isLimited: !!req.gameLimit });
  } catch (err) { next(err); }
});

// ─── GAME HISTORY ────────────────────────────────────────
router.get('/game-history', checkSubscription, async (req, res, next) => {
  try {
    const user = req.user;
    const where = { status: { in: ['COMPLETED', 'ARCHIVED'] } };

    if (user.role === 'PLAYER') {
      where.players = { some: { playerId: user.id } };
    } else if (user.role === 'HOST') {
      where.hostId = user.id;
    } else if (user.role === 'ADMIN') {
      where.OR = [{ hostId: user.id }, { host: { managedById: user.id } }];
    }

    const games = await prisma.game.findMany({
      where,
      include: {
        host: { select: { displayName: true } },
        _count: { select: { players: true } },
      },
      orderBy: { startTime: 'desc' },
      ...(req.gameLimit ? { take: req.gameLimit } : {}),
    });

    res.json({ games, isLimited: !!req.gameLimit });
  } catch (err) { next(err); }
});

module.exports = router;
