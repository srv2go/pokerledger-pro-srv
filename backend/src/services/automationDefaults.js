const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_AUTOMATIONS = [
  {
    key: 'session_reminder_2h',
    name: 'Session reminder',
    description: 'Ping confirmed players two hours before the table opens.',
    trigger: 'PRE_GAME_REMINDER',
    preset: 'TWO_HOURS_BEFORE',
    timezone: 'UTC',
    channels: ['WHATSAPP', 'IN_APP'],
  },
  {
    key: 'session_start_followup',
    name: 'Session follow-up',
    description: 'Send quick recap once the table closes.',
    trigger: 'POST_GAME_SUMMARY',
    preset: 'DAY_AFTER',
    timezone: 'UTC',
    channels: ['WHATSAPP', 'IN_APP'],
  },
  {
    key: 'weekly_digest',
    name: 'Weekly digest',
    description: 'Monday 9am recap with float, rake, and outstanding balances.',
    trigger: 'WEEKLY_DIGEST',
    preset: 'WEEKLY_SUMMARY',
    timezone: 'UTC',
    channels: ['EMAIL'],
  },
  {
    key: 'monthly_report',
    name: 'Monthly report',
    description: 'First day of the month export with full ledger attachment.',
    trigger: 'MONTHLY_REPORT',
    preset: 'MONTHLY_REPORT',
    timezone: 'UTC',
    channels: ['EMAIL'],
  },
];

const ALLOWED_PRESETS = new Set([
  'TWO_HOURS_BEFORE',
  'ONE_HOUR_BEFORE',
  'THIRTY_MINUTES_BEFORE',
  'DAY_AFTER',
  'WEEKLY_SUMMARY',
  'MONTHLY_REPORT',
  'CUSTOM',
]);

const ensureDefaultAutomations = async (hostId) => {
  const existing = await prisma.automation.findMany({ where: { hostId } });
  const missing = DEFAULT_AUTOMATIONS.filter(def => !existing.some(auto => auto.key === def.key));
  if (missing.length) {
    await prisma.$transaction(missing.map(def => prisma.automation.create({ data: { ...def, hostId } })));
  }
  return prisma.automation.findMany({ where: { hostId }, orderBy: { createdAt: 'asc' } });
};

module.exports = { DEFAULT_AUTOMATIONS, ALLOWED_PRESETS, ensureDefaultAutomations };
