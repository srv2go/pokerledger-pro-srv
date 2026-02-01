const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const formatPhone = (phone) => phone ? phone.replace(/[\s\-\+\(\)]/g, '') : null;

const sendMessage = async (to, message) => {
  const phone = formatPhone(to);
  if (!phone || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return { success: false, reason: phone ? 'not_configured' : 'no_phone' };
  }
  try {
    const resp = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { preview_url: false, body: message } }),
    });
    const data = await resp.json();
    if (!resp.ok) { console.error('WhatsApp error:', data); return { success: false, error: data.error?.message }; }
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error('WhatsApp send error:', err);
    return { success: false, error: err.message };
  }
};

const logNotification = async (userId, type, title, msg, result) => {
  await prisma.notification.create({
    data: { userId, type, title, message: msg, channel: 'WHATSAPP', status: result.success ? 'SENT' : 'FAILED', externalId: result.messageId, sentAt: result.success ? new Date() : null }
  }).catch(console.warn);
};

// ─── PLAIN NOTIFICATIONS (no game details, just points + time) ───

const notifyBuyIn = async (player, game, amount, isRebuy) => {
  if (!player?.phone) return;
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const msg = `${parseFloat(amount)} points credited at ${time}`;
  const result = await sendMessage(player.phone, msg);
  await logNotification(player.id, isRebuy ? 'RE_BUY' : 'BUY_IN', 'Points Credited', msg, result);
  return result;
};

const notifyTopUp = async (player, game, amount, newTotal) => {
  if (!player?.phone) return;
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const msg = `${parseFloat(amount)} points added at ${time}. Total: ${parseFloat(newTotal)} points`;
  const result = await sendMessage(player.phone, msg);
  await logNotification(player.id, 'TOP_UP', 'Points Added', msg, result);
  return result;
};

const notifyCashOut = async (player, game, cashOut, totalInvested) => {
  if (!player?.phone) return;
  const profit = cashOut - totalInvested;
  const msg = profit >= 0
    ? `Debited ${parseFloat(totalInvested)} points, balance ${parseFloat(cashOut)} points. Net: +${parseFloat(profit)} points`
    : `Debited ${parseFloat(totalInvested)} points, balance ${parseFloat(cashOut)} points. Net: ${parseFloat(profit)} points`;
  const result = await sendMessage(player.phone, msg);
  await logNotification(player.id, 'CASH_OUT', 'Points Settled', msg, result);
  return result;
};

const sendGameInvitation = async (player, game, host) => {
  if (!player?.phone) return;
  const date = new Date(game.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const msg = `You're invited to a game on ${date}. ${parseFloat(game.buyInAmount)} points buy-in.`;
  return await sendMessage(player.phone, msg);
};

const sendSettlementReminder = async (player, amount, owes, hostName) => {
  if (!player?.phone) return;
  const msg = owes
    ? `Reminder: You have an outstanding balance of ${amount} points. Please settle at your convenience.`
    : `Your balance update: ${amount} points credit.`;
  const result = await sendMessage(player.phone, msg);
  await logNotification(player.id, 'SETTLEMENT_REMINDER', 'Settlement Reminder', msg, result);
  return result;
};

const sendGameSummary = async (player, stats) => {
  if (!player?.phone) return;
  const msg = `Game complete. Invested: ${stats.totalInvested} pts, Cash-out: ${stats.cashOut} pts, Net: ${stats.profit >= 0 ? '+' : ''}${stats.profit} pts`;
  return await sendMessage(player.phone, msg);
};

module.exports = { sendMessage, notifyBuyIn, notifyTopUp, notifyCashOut, sendGameInvitation, sendSettlementReminder, sendGameSummary };
