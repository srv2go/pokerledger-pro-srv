const twilio = require('twilio');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

let client = null;
try {
  if (ACCOUNT_SID && AUTH_TOKEN) {
    client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  }
} catch (err) {
  console.warn('Twilio init failed:', err.message);
}

const isConfigured = () => Boolean(client && FROM_NUMBER);

const sendSms = async (to, body) => {
  if (!isConfigured()) {
    console.log('SMS skip: Twilio not configured');
    return { success: false, reason: 'not_configured' };
  }
  try {
    const message = await client.messages.create({ from: FROM_NUMBER, to, body });
    console.log(`SMS sent to ${to}: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (err) {
    console.error('Twilio send error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendSms, isConfigured };
