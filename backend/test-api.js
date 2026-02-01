const fetch = require('node-fetch');

async function testGameCreation() {
  const API_BASE = 'https://pokerledger-backend.onrender.com/api';
  
  // First, login to get a token
  console.log('1. Logging in...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'varadsrinir@gmail.com',
      password: 'test123'
    })
  });
  
  if (!loginRes.ok) {
    const error = await loginRes.json();
    console.error('Login failed:', error);
    
    // Try to register
    console.log('Trying to register...');
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'test123',
        displayName: 'Test User'
      })
    });
    const regData = await regRes.json();
    console.log('Registration result:', regData);
    return;
  }
  
  const { token } = await loginRes.json();
  console.log('✅ Logged in successfully\n');
  
  // Get players
  console.log('2. Fetching players...');
  const playersRes = await fetch(`${API_BASE}/players`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { players } = await playersRes.json();
  console.log(`Found ${players.length} players\n`);
  
  // Create a game
  console.log('3. Creating game...');
  const gameData = {
    name: 'Test Game API',
    gameType: 'TEXAS_HOLDEM',
    startTime: new Date().toISOString(),
    buyInAmount: 100,
    location: 'Test Location',
    blindsSmall: 1,
    blindsBig: 2,
    rakePercentage: 0,
    rebuyPolicy: 'UNLIMITED',
    playerIds: players.slice(0, 2).map(p => p.id)
  };
  
  console.log('Game data:', JSON.stringify(gameData, null, 2));
  
  const gameRes = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(gameData)
  });
  
  if (!gameRes.ok) {
    const error = await gameRes.json();
    console.error('❌ Game creation failed:', error);
  } else {
    const { game } = await gameRes.json();
    console.log('✅ Game created successfully:', game.id);
  }
}

testGameCreation().catch(console.error);
