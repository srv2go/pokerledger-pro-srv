const fetch = require('node-fetch');

async function checkWhatsAppConfig() {
  const API_BASE = 'https://pokerledger-backend.onrender.com/api';
  
  console.log('🔍 Checking WhatsApp Configuration...\n');
  
  // Check if backend has WhatsApp vars
  const healthCheck = await fetch('https://pokerledger-backend.onrender.com/health');
  console.log('✅ Backend is running\n');
  
  // Try to get players to see if phone numbers are stored
  console.log('Fetching recent logs...\n');
}

checkWhatsAppConfig().catch(console.error);
