const { PrismaClient } = require('@prisma/client');
const { sendSms, isConfigured: smsConfigured } = require('./twilio');

const prisma = new PrismaClient();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const channelOrder = ['WHATSAPP', 'SMS'];
const defaultConsents = {
  WHATSAPP: { status: 'ALLOWED', source: 'system_default' },
  SMS: { status: 'PENDING', source: 'system_default' },
};

const cleanDigits = (phone) => phone ? phone.replace(/[^0-9]/g, '') : null;
const e164Format = (phone) => {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = cleanDigits(trimmed);
  if (!digits) return null;
  return `+${digits}`;
};

const sendWhatsApp = async (to, message) => {
  const digits = cleanDigits(to);
  if (!digits || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`WA skip: ${!digits ? 'no phone' : 'not configured'}`);
    return { success: false, reason: !digits ? 'no_phone' : 'not_configured' };
  }
  try {
    const resp = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: digits, type: 'text', text: { preview_url: false, body: message } }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error(`WhatsApp API error to ${digits}:`, data.error?.message || data);
      return { success: false, error: data.error?.message };
    }
    console.log(`WA sent to ${digits}: ${data.messages?.[0]?.id}`);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
    return { success: false, error: err.message };
  }
};

const logNotification = async (userId, type, title, msg, channel, result) => {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message: msg,
      channel,
      status: result.success ? 'SENT' : 'FAILED',
      externalId: result.messageId,
      metadata: { channel, reason: result.error || result.reason || null },
      sentAt: result.success ? new Date() : null,
    }
  }).catch(() => {});
};

const ensureConsentRecord = async (userId, channel) => {
  const existing = await prisma.messagingConsent.findUnique({ where: { userId_channel: { userId, channel } } });
  if (existing) return existing;
  const defaults = defaultConsents[channel] || { status: 'PENDING', source: 'system_default' };
  return prisma.messagingConsent.create({ data: { userId, channel, status: defaults.status, source: defaults.source } });
};

const hasConsent = async (userId, channel) => {
  const consent = await ensureConsentRecord(userId, channel);
  return consent.status === 'ALLOWED';
};

const dispatchMessage = async (user, message, title, type) => {
  if (!user?.phone) return { success: false, reason: 'no_phone' };
  for (const channel of channelOrder) {
    if (channel === 'WHATSAPP' && !user.whatsappEnabled) continue;
    if (channel === 'SMS' && !smsConfigured()) continue;
    const permitted = await hasConsent(user.id, channel);
    if (!permitted) continue;
    const target = channel === 'WHATSAPP' ? cleanDigits(user.phone) : e164Format(user.phone);
    if (!target) continue;
    const result = await (channel === 'WHATSAPP' ? sendWhatsApp(target, message) : sendSms(target, message));
    await logNotification(user.id, type, title, message, channel, result);
    if (result.success) return result;
  }
  return { success: false, reason: 'no_channel_available' };
};

const notifyBuyIn = async (player, game, amount, isRebuy = false) => {
  if (!player) return { success: false, reason: 'no_player' };
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const msg = `${parseFloat(amount)} points credited at ${time}`;
  return dispatchMessage(player, msg, 'Points Credited', isRebuy ? 'RE_BUY' : 'BUY_IN');
};

const notifyTopUp = async (player, game, amount, newTotal) => {
  if (!player) return { success: false, reason: 'no_player' };
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const msg = `${parseFloat(amount)} points added at ${time}. Total: ${parseFloat(newTotal)} points`;
  return dispatchMessage(player, msg, 'Points Added', 'TOP_UP');
};

const notifyCashOut = async (player, game, cashOut, totalInvested) => {
  if (!player) return { success: false, reason: 'no_player' };
  const profit = cashOut - totalInvested;
  const msg = profit >= 0
    ? `Debited ${parseFloat(totalInvested)} pts, balance ${parseFloat(cashOut)} pts. Net: +${parseFloat(profit)} pts`
    : `Debited ${parseFloat(totalInvested)} pts, balance ${parseFloat(cashOut)} pts. Net: ${parseFloat(profit)} pts`;
  return dispatchMessage(player, msg, 'Points Settled', 'CASH_OUT');
};

const sendGameInvitation = async (player, game, host) => {
  if (!player) return { success: false, reason: 'no_player' };
  const date = new Date(game.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const msg = `You're invited to ${game.name} on ${date}. Buy-in ${parseFloat(game.buyInAmount)} pts.`;
  return dispatchMessage(player, msg, 'Game Invitation', 'GAME_INVITATION');
};

const sendSettlementReminder = async (player, amount, owes, hostName) => {
  if (!player) return { success: false, reason: 'no_player' };
  const msg = owes
    ? `Reminder: You owe ${amount} pts to ${hostName || 'host'}. Please settle soon.`
    : `Credit update: ${amount} pts in your favor. Thank you!`;
  return dispatchMessage(player, msg, 'Settlement Reminder', 'SETTLEMENT_REMINDER');
};

const sendGameSummary = async (player, stats) => {
  if (!player) return { success: false, reason: 'no_player' };
  const msg = `Game complete. Invested ${stats.totalInvested} pts, Cash-out ${stats.cashOut} pts, Net ${stats.profit >= 0 ? '+' : ''}${stats.profit} pts.`;
  return dispatchMessage(player, msg, 'Game Summary', 'GAME_SUMMARY');
};

const setChannelConsent = async (userId, channel, enabled, source = 'manual_toggle') => {
  const status = enabled ? 'ALLOWED' : 'REVOKED';
  const now = new Date();
  return prisma.messagingConsent.upsert({
    where: { userId_channel: { userId, channel } },
    update: { status, source, capturedAt: enabled ? now : undefined, revokedAt: enabled ? null : now },
    create: { userId, channel, status, source, capturedAt: now, revokedAt: enabled ? null : now },
  });
};

const seedDefaultConsents = async (userId) => {
  await Promise.all(Object.entries(defaultConsents).map(([channel, defaults]) =>
    prisma.messagingConsent.upsert({
      where: { userId_channel: { userId, channel } },
      update: {},
      create: { userId, channel, status: defaults.status, source: defaults.source },
    })
  ));
};

const getConsentSnapshot = async (userId) => {
  const records = await prisma.messagingConsent.findMany({ where: { userId } });
  const snapshot = {};
  records.forEach(rec => { snapshot[rec.channel] = rec.status; });
  return snapshot;
};

module.exports = {
  notifyBuyIn,
  notifyTopUp,
  notifyCashOut,
  sendGameInvitation,
  sendSettlementReminder,
  sendGameSummary,
  setChannelConsent,
  seedDefaultConsents,
  getConsentSnapshot,
};
