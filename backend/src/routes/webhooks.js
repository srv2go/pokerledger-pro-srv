const express = require('express');
const router = express.Router();

const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

/**
 * GET /webhooks/whatsapp
 * WhatsApp webhook verification endpoint
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('WhatsApp webhook verification failed');
  res.sendStatus(403);
});

/**
 * POST /webhooks/whatsapp
 * Handle incoming WhatsApp messages and status updates
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry || !entry[0]) {
      return res.sendStatus(200);
    }

    const changes = entry[0].changes;
    
    for (const change of changes) {
      const { value } = change;

      // Handle message status updates (sent, delivered, read)
      if (value.statuses) {
        for (const status of value.statuses) {
          console.log(`WhatsApp message ${status.id}: ${status.status}`);
          // Could update notification status in database here
        }
      }

      // Handle incoming messages (if player replies)
      if (value.messages) {
        for (const message of value.messages) {
          console.log(`Received WhatsApp message from ${message.from}: ${message.text?.body || '[non-text]'}`);
          // Could handle player replies here if needed
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.sendStatus(200); // Always return 200 to prevent retries
  }
});

module.exports = router;
