const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { seedDefaultConsents, setChannelConsent } = require('./services/messaging');
const { ensureDefaultAutomations } = require('./services/automationDefaults');

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'LedgerAI!23';

const users = [
  { email: 'super@ledger.ai', displayName: 'Ledger Super', role: 'SUPER_ADMIN', phone: '+12065550100', subscription: 'PREMIUM' },
  { email: 'host@ledger.ai', displayName: 'Ledger Host', role: 'HOST', phone: '+12065550101', subscription: 'PREMIUM' },
  { email: 'player1@ledger.ai', displayName: 'Bianca Bluff', role: 'PLAYER', phone: '+12065550102', subscription: 'FREE' },
  { email: 'player2@ledger.ai', displayName: 'Ravi Runner', role: 'PLAYER', phone: '+12065550103', subscription: 'FREE' },
];

async function upsertUser({ email, displayName, role, phone, subscription }) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName, role, phone, subscription, passwordHash },
    create: { email, displayName, role, phone, subscription, passwordHash },
  });
  await seedDefaultConsents(user.id);
  await setChannelConsent(user.id, 'WHATSAPP', true, 'seed');
  return user;
}

async function seedGame(host, playerA, playerB) {
  const existing = await prisma.game.findFirst({ where: { hostId: host.id, name: 'Staging Session A' } });
  if (existing) return existing;

  const game = await prisma.game.create({
    data: {
      hostId: host.id,
      name: 'Staging Session A',
      gameType: 'TEXAS_HOLDEM',
      status: 'COMPLETED',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 4),
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
      buyInAmount: new Prisma.Decimal(200),
      rakePercentage: new Prisma.Decimal(5),
      notes: 'Seeded session for QA and staging environments',
      players: {
        create: [
          {
            playerId: playerA.id,
            initialBuyIn: new Prisma.Decimal(200),
            totalInvested: new Prisma.Decimal(400),
            cashOut: new Prisma.Decimal(550),
            finalBalance: new Prisma.Decimal(150),
            status: 'CASHED_OUT',
            session: 2,
          },
          {
            playerId: playerB.id,
            initialBuyIn: new Prisma.Decimal(200),
            totalInvested: new Prisma.Decimal(200),
            cashOut: new Prisma.Decimal(120),
            finalBalance: new Prisma.Decimal(-80),
            status: 'CASHED_OUT',
            session: 1,
          },
        ],
      },
      transactions: {
        create: [
          { playerId: playerA.id, type: 'BUY_IN', amount: new Prisma.Decimal(200), paymentMethod: 'CASH', session: 1 },
          { playerId: playerA.id, type: 'RE_BUY', amount: new Prisma.Decimal(200), paymentMethod: 'CASH', session: 2 },
          { playerId: playerB.id, type: 'BUY_IN', amount: new Prisma.Decimal(200), paymentMethod: 'CASH', session: 1 },
          { playerId: playerA.id, type: 'CASH_OUT', amount: new Prisma.Decimal(550), session: 2 },
          { playerId: playerB.id, type: 'CASH_OUT', amount: new Prisma.Decimal(120), session: 1 },
        ],
      },
      gameFloats: {
        create: [{ amount: new Prisma.Decimal(300), notes: 'ATM top-up' }],
      },
      expenses: {
        create: [
          { category: 'FOOD', amount: new Prisma.Decimal(80), notes: 'Dinner spread' },
          { category: 'DEALER', amount: new Prisma.Decimal(150), notes: 'Dealer fee' },
        ],
      },
    },
  });

  await prisma.rollingBalance.upsert({
    where: { playerId_hostId: { playerId: playerA.id, hostId: host.id } },
    create: { playerId: playerA.id, hostId: host.id, totalBuyIn: new Prisma.Decimal(400), totalCashOut: new Prisma.Decimal(550), balance: new Prisma.Decimal(150), lastGameId: game.id },
    update: { totalBuyIn: new Prisma.Decimal(400), totalCashOut: new Prisma.Decimal(550), balance: new Prisma.Decimal(150), lastGameId: game.id },
  });
  await prisma.rollingBalance.upsert({
    where: { playerId_hostId: { playerId: playerB.id, hostId: host.id } },
    create: { playerId: playerB.id, hostId: host.id, totalBuyIn: new Prisma.Decimal(200), totalCashOut: new Prisma.Decimal(120), balance: new Prisma.Decimal(-80), lastGameId: game.id },
    update: { totalBuyIn: new Prisma.Decimal(200), totalCashOut: new Prisma.Decimal(120), balance: new Prisma.Decimal(-80), lastGameId: game.id },
  });

  return game;
}

async function main() {
  console.log('🌱 Seeding PokerLedger Pro staging data...');
  const [superAdmin, host, playerA, playerB] = await Promise.all(users.map(upsertUser));
  await ensureDefaultAutomations(host.id);
  const game = await seedGame(host, playerA, playerB);

  console.log('✅ Seed complete');
  console.log('Accounts:');
  console.log(`  Super Admin: ${superAdmin.email} / ${DEFAULT_PASSWORD}`);
  console.log(`  Host:        ${host.email} / ${DEFAULT_PASSWORD}`);
  console.log(`  Player A:    ${playerA.email} / ${DEFAULT_PASSWORD}`);
  console.log(`  Player B:    ${playerB.email} / ${DEFAULT_PASSWORD}`);
  console.log('Sample game ->', game.name);
}

main()
  .catch(err => {
    console.error('Seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
