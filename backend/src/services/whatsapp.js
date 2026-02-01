/**
 * WhatsApp Cloud API Service
 * Sends courtesy notifications to players when host records transactions
 * Updated: 2026-02-01 - Fixed notification type enums
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Format phone number to WhatsApp format (remove + and spaces)
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  return phone.replace(/[\s\-\+\(\)]/g, '');
};

/**
 * Format currency
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Send a WhatsApp message using Cloud API
 */
const sendWhatsAppMessage = async (to, message, type = 'text') => {
  const formattedPhone = formatPhoneNumber(to);
  
  if (!formattedPhone) {
    console.warn('No phone number provided, skipping WhatsApp notification');
    return { success: false, reason: 'no_phone' };
  }

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn('WhatsApp API not configured. Skipping message send.');
    return { success: false, reason: 'not_configured' };
  }

  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: type,
  };

  if (type === 'text') {
    payload.text = { 
      preview_url: false,
      body: message 
    };
  } else if (type === 'interactive') {
    payload.interactive = message;
  }

  try {
    console.log(`📱 Sending WhatsApp to ${formattedPhone}:`, message.substring(0, 100));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return { 
        success: false, 
        reason: 'api_error',
        error: data 
      };
    }

    console.log(`✅ WhatsApp sent successfully to ${formattedPhone}. Message ID: ${data.messages?.[0]?.id}`);
    return { 
      success: true, 
      messageId: data.messages?.[0]?.id 
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { 
      success: false, 
      reason: 'network_error',
      error: error.message 
    };
  }
};

/**
 * Notify player of buy-in recorded by host
 */
const notifyBuyIn = async (player, game, amount, isRebuy = false) => {
  if (!player?.phone) {
    return { success: false, reason: 'no_phone' };
  }

  const type = isRebuy ? 'Re-buy' : 'Buy-in';
  const emoji = isRebuy ? '🔄' : '💵';
  
  const points = Math.floor(amount);
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const message = `${emoji} ${type} recorded
${points} points
Time: ${timestamp}`;

  const result = await sendWhatsAppMessage(player.phone, message);

  // Log notification
  if (player.id) {
    await prisma.notification.create({
      data: {
        userId: player.id,
        type: 'BALANCE_REMINDER',
        title: `${type} Recorded`,
        message: `${points} points recorded`,
        channel: 'WHATSAPP',
        status: result.success ? 'SENT' : 'FAILED',
        externalId: result.messageId,
        sentAt: result.success ? new Date() : null,
        metadata: { gameId: game.id, amount }
      }
    }).catch(err => console.warn('Failed to log notification:', err));
  }

  return result;
};

/**
 * Notify player of top-up recorded by host
 */
const notifyTopUp = async (player, game, amount, newTotal) => {
  if (!player?.phone) {
    return { success: false, reason: 'no_phone' };
  }

  const points = Math.floor(amount);
  const balance = Math.floor(newTotal);
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const message = `💵 Top-up credited
${points} points
Total invested: ${balance} points
Time: ${timestamp}`;

  const result = await sendWhatsAppMessage(player.phone, message);

  if (player.id) {
    await prisma.notification.create({
      data: {
        userId: player.id,
        type: 'TOP_UP_APPROVED',
        title: 'Top-Up Credited',
        message: `${points} points credited`,
        channel: 'WHATSAPP',
        status: result.success ? 'SENT' : 'FAILED',
        externalId: result.messageId,
        sentAt: result.success ? new Date() : null,
        metadata: { gameId: game.id, amount, newTotal }
      }
    }).catch(err => console.warn('Failed to log notification:', err));
  }

  return result;
};

/**
 * Notify player of cash-out with profit/loss summary
 */
const notifyCashOut = async (player, game, cashOutAmount, totalInvested) => {
  if (!player?.phone) {
    return { success: false, reason: 'no_phone' };
  }

  const debited = Math.floor(cashOutAmount);
  const balance = Math.floor(profit);
  const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const message = `💸 Cash-out complete
Debited: ${debited} points
Balance: ${balance >= 0 ? '+' : ''}${balance} points
Time: ${timestamp}
Thanks for playing!`;

  const result = await sendWhatsAppMessage(player.phone, message);

  if (player.id) {
    await prisma.notification.create({
      data: {
        userId: player.id,
        type: 'GAME_SUMMARY',
        title: 'Cash-Out Complete',
        message: `${debited} points debited, balance ${balance >= 0 ? '+' : ''}${balance} points`,
        channel: 'WHATSAPP',
        status: result.success ? 'SENT' : 'FAILED',
        externalId: result.messageId,
        sentAt: result.success ? new Date() : null,
        metadata: { gameId: game.id, cashOutAmount, totalInvested, profit }
      }
    }).catch(err => console.warn('Failed to log notification:', err));
  }

  return result;
};

/**
 * Send game invitation to player
 */
const sendGameInvitation = async (player, game, host) => {
  if (!player?.phone) {
    return { success: false, reason: 'no_phone' };
  }

  const gameDate = new Date(game.startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const message = `🃏 *Game Invitation*

You're invited to *${game.name}*!

📅 ${gameDate}
📍 ${game.location || 'Location TBD'}
💰 Buy-in: ${formatCurrency(game.buyInAmount)}
🎯 ${game.gameType?.replace('_', ' ') || 'Texas Hold\'em'}
${game.blindsSmall ? `🎲 Blinds: $${game.blindsSmall}/$${game.blindsBig}` : ''}

Host: ${host?.displayName || 'Your host'}

See you at the table! 🍀`;

  const result = await sendWhatsAppMessage(player.phone, message);

  if (player.id) {
    await prisma.notification.create({
      data: {
        userId: player.id,
        type: 'GAME_INVITATION',
        title: 'Game Invitation',
        message: `You're invited to ${game.name}`,
        channel: 'WHATSAPP',
        status: result.success ? 'SENT' : 'FAILED',
        externalId: result.messageId,
        sentAt: result.success ? new Date() : null,
        metadata: { gameId: game.id }
      }
    }).catch(err => console.warn('Failed to log notification:', err));
  }

  return result;
};

/**
 * Send game starting reminder
 */
const sendGameReminder = async (player, game) => {
  if (!player?.phone) {
    return { success: false, reason: 'no_phone' };
  }

  const message = `⏰ *Game Starting Soon!*

*${game.name}* is about to begin!

📍 ${game.location || 'Check with host'}
💰 Buy-in: ${formatCurrency(game.buyInAmount)}

See you there! 🃏`;

  return await sendWhatsAppMessage(player.phone, message);
};

/**
 * Send game ended summary to player
 */
const sendGameSummary = async (player, game, playerStats) => {
  if (!player?.phone) {
    return { success: false, reason: 'no_phone' };
  }

  const profit = playerStats.profit || 0;
  const isProfit = profit >= 0;

  const message = `🏁 *Game Complete*

*${game.name}* has ended.

Your Results:
💰 Invested: ${formatCurrency(playerStats.totalInvested)}
💵 Cashed Out: ${formatCurrency(playerStats.cashOut || 0)}
${isProfit ? '📈 Profit' : '📉 Loss'}: ${formatCurrency(Math.abs(profit))}

Thanks for playing! 🃏`;

  return await sendWhatsAppMessage(player.phone, message);
};

module.exports = {
  sendWhatsAppMessage,
  formatPhoneNumber,
  formatCurrency,
  notifyBuyIn,
  notifyTopUp,
  notifyCashOut,
  sendGameInvitation,
  sendGameReminder,
  sendGameSummary
};
