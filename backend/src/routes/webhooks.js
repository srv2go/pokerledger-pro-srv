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

  console.log('Webhook verification attempt:', { 
    mode, 
    receivedToken: token, 
    expectedToken: WEBHOOK_VERIFY_TOKEN,
    challenge 
  });

  if (!WEBHOOK_VERIFY_TOKEN) {
    console.error('WHATSAPP_WEBHOOK_VERIFY_TOKEN not set in environment variables!');
    return res.status(500).send('Webhook verify token not configured');
  }

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('❌ WhatsApp webhook verification failed - token mismatch');
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

      // Handle message status updates (sent, delivered, read, failed)
      if (value.statuses) {
        for (const status of value.statuses) {
          console.log(`WhatsApp message ${status.id}: ${status.status}`);
          
          // Log error details if message failed
          if (status.status === 'failed' && status.errors) {
            console.error('❌ WhatsApp message failed:');
            status.errors.forEach(error => {
              console.error(`  - Error ${error.code}: ${error.title}`);
              console.error(`    Details: ${error.message || 'No details'}`);
              console.error(`    Error data:`, error.error_data || 'None');
            });
          }
          
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
