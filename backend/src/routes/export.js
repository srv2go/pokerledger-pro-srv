const express = require('express');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { requireMinRole, canSeeRake } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ─── EXPORT GAME TO EXCEL ────────────────────────────────
router.get('/game/:gameId', requireMinRole('HOST'), async (req, res, next) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.gameId },
      include: {
        host: { select: { displayName: true } },
        players: {
          include: { player: { select: { displayName: true, email: true, phone: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        transactions: {
          include: { player: { select: { displayName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        gameFloats: { orderBy: { createdAt: 'asc' } },
        expenses: { orderBy: { createdAt: 'asc' } },
      }
    });

    if (!game) return res.status(404).json({ error: 'Game not found' });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PokerLedger Pro';
    workbook.created = new Date();

    // ── Sheet 1: Game Summary ──
    const summary = workbook.addWorksheet('Game Summary');
    summary.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 35 },
    ];
    summary.addRows([
      { field: 'Game Name', value: game.name },
      { field: 'Game Type', value: game.gameType.replace('_', ' ') },
      { field: 'Host', value: game.host.displayName },
      { field: 'Status', value: game.status },
      { field: 'Start Time', value: game.startTime?.toISOString() },
      { field: 'End Time', value: game.endTime?.toISOString() || 'N/A' },
      { field: 'Buy-in (points)', value: parseFloat(game.buyInAmount) },
      { field: 'Blinds', value: game.blindsSmall ? `${game.blindsSmall}/${game.blindsBig}` : 'N/A' },
      { field: 'Total Players', value: game.players.length },
    ]);

    if (canSeeRake(req.user)) {
      const totalBuyIn = game.players.reduce((s, p) => s + parseFloat(p.totalInvested || 0), 0);
      const totalCashOut = game.players.reduce((s, p) => s + parseFloat(p.cashOut || 0), 0);
      const totalFloat = game.gameFloats.reduce((s, f) => s + parseFloat(f.amount), 0);
      const totalExpenses = game.expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

      summary.addRows([
        { field: 'Rake %', value: `${game.rakePercentage}%` },
        { field: 'Total Buy-ins (points)', value: totalBuyIn },
        { field: 'Total Cash-outs (points)', value: totalCashOut },
        { field: 'Total Float (points)', value: totalFloat },
        { field: 'Total Expenses (points)', value: totalExpenses },
        { field: 'Net Rake (points)', value: (totalFloat + totalBuyIn) - totalCashOut - totalExpenses },
      ]);
    }

    // Style header
    summary.getRow(1).font = { bold: true };

    // ── Sheet 2: Players ──
    const playersSheet = workbook.addWorksheet('Players');
    const playerCols = [
      { header: 'Player', key: 'name', width: 25 },
      { header: 'Session', key: 'session', width: 10 },
      { header: 'Buy-in (points)', key: 'buyIn', width: 18 },
      { header: 'Total Invested (points)', key: 'totalInvested', width: 22 },
      { header: 'Cash Out (points)', key: 'cashOut', width: 18 },
      { header: 'Profit/Loss (points)', key: 'profit', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Joined', key: 'joined', width: 20 },
      { header: 'Left', key: 'left', width: 20 },
    ];
    playersSheet.columns = playerCols;

    for (const gp of game.players) {
      playersSheet.addRow({
        name: gp.player.displayName,
        session: gp.session,
        buyIn: parseFloat(gp.initialBuyIn),
        totalInvested: parseFloat(gp.totalInvested),
        cashOut: gp.cashOut !== null ? parseFloat(gp.cashOut) : '-',
        profit: gp.finalBalance !== null ? parseFloat(gp.finalBalance) : '-',
        status: gp.status,
        joined: gp.joinedAt?.toISOString(),
        left: gp.leftAt?.toISOString() || '-',
      });
    }
    playersSheet.getRow(1).font = { bold: true };

    // ── Sheet 3: Transactions ──
    const txSheet = workbook.addWorksheet('Transactions');
    txSheet.columns = [
      { header: 'Time', key: 'time', width: 22 },
      { header: 'Player', key: 'player', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Amount (points)', key: 'amount', width: 18 },
      { header: 'Session', key: 'session', width: 10 },
      { header: 'Payment', key: 'payment', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    for (const tx of game.transactions) {
      txSheet.addRow({
        time: tx.createdAt.toISOString(),
        player: tx.player.displayName,
        type: tx.type,
        amount: parseFloat(tx.amount),
        session: tx.session,
        payment: tx.paymentMethod,
        notes: tx.notes || '',
      });
    }
    txSheet.getRow(1).font = { bold: true };

    // ── Sheet 4: Float & Expenses (host only) ──
    if (canSeeRake(req.user) && (game.gameFloats.length > 0 || game.expenses.length > 0)) {
      const feSheet = workbook.addWorksheet('Float & Expenses');
      feSheet.columns = [
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Amount (points)', key: 'amount', width: 18 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'Time', key: 'time', width: 22 },
      ];

      for (const f of game.gameFloats) {
        feSheet.addRow({ type: 'FLOAT', category: '-', amount: parseFloat(f.amount), notes: f.notes || '', time: f.createdAt.toISOString() });
      }
      for (const e of game.expenses) {
        feSheet.addRow({ type: 'EXPENSE', category: e.category, amount: parseFloat(e.amount), notes: e.notes || '', time: e.createdAt.toISOString() });
      }
      feSheet.getRow(1).font = { bold: true };
    }

    // Send as download
    const fileName = `${game.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
