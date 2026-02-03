const express = require('express');
const router = express.Router();

router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/whatsapp', (req, res) => {
  // Log statuses and incoming messages
  const entry = req.body?.entry?.[0];
  if (entry?.changes) {
    for (const change of entry.changes) {
      if (change.value?.statuses) {
        change.value.statuses.forEach(s => {
          const status = s.status;
          const errorInfo = s.errors?.[0] ? ` (${s.errors[0].code}: ${s.errors[0].title})` : '';
          console.log(`WA msg ${s.id}: ${status}${errorInfo}`);
        });
      }
      // Log incoming messages (user replies)
      if (change.value?.messages) {
        change.value.messages.forEach(m => {
          console.log(`WA incoming from ${m.from}: ${m.text?.body || m.type}`);
        });
      }
    }
  }
  res.sendStatus(200);
});

module.exports = router;
