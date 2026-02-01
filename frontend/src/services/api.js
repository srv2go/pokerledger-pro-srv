const API = '/api';
const getToken = () => localStorage.getItem('token');

const request = async (endpoint, options = {}) => {
  const token = getToken();
  const config = {
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers },
    ...options,
  };
  if (config.body && typeof config.body === 'object' && !(config.body instanceof Blob)) {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(`${API}${endpoint}`, config);
  if (endpoint.includes('/export/') && res.ok) return res; // blob response
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
};

export const authApi = {
  register: (d) => request('/auth/register', { method: 'POST', body: d }),
  login: (d) => request('/auth/login', { method: 'POST', body: d }),
  autoLogin: (rememberToken) => request('/auth/auto-login', { method: 'POST', body: { rememberToken } }),
  verifyPin: (userId, pin) => request('/auth/verify-pin', { method: 'POST', body: { userId, pin } }),
  setPin: (pin) => request('/auth/set-pin', { method: 'POST', body: { pin } }),
  getProfile: () => request('/auth/me'),
  updateProfile: (d) => request('/auth/profile', { method: 'PUT', body: d }),
  promote: (userId, role) => request('/auth/promote', { method: 'POST', body: { userId, role } }),
};

export const gamesApi = {
  list: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/games${q ? `?${q}` : ''}`); },
  get: (id) => request(`/games/${id}`),
  create: (d) => request('/games', { method: 'POST', body: d }),
  update: (id, d) => request(`/games/${id}`, { method: 'PUT', body: d }),
  delete: (id) => request(`/games/${id}`, { method: 'DELETE' }),
  start: (id) => request(`/games/${id}/start`, { method: 'POST' }),
  pause: (id) => request(`/games/${id}/pause`, { method: 'POST' }),
  resume: (id) => request(`/games/${id}/resume`, { method: 'POST' }),
  end: (id) => request(`/games/${id}/end`, { method: 'POST' }),
  addFloat: (id, d) => request(`/games/${id}/float`, { method: 'POST', body: d }),
  addExpense: (id, d) => request(`/games/${id}/expense`, { method: 'POST', body: d }),
  tableCashout: (id, d) => request(`/games/${id}/table-cashout`, { method: 'POST', body: d }),
  invite: (id, playerIds) => request(`/games/${id}/invite`, { method: 'POST', body: { playerIds } }),
};

export const transactionsApi = {
  buyIn: (d) => request('/transactions/buy-in', { method: 'POST', body: { sendNotification: true, ...d } }),
  topUp: (d) => request('/transactions/top-up', { method: 'POST', body: { sendNotification: true, ...d } }),
  cashOut: (d) => request('/transactions/cash-out', { method: 'POST', body: { sendNotification: true, ...d } }),
  adjustment: (d) => request('/transactions/adjustment', { method: 'POST', body: d }),
  editTransaction: (txId, d) => request(`/transactions/${txId}`, { method: 'PUT', body: d }),
  getGameTx: (gameId) => request(`/transactions/game/${gameId}`),
  getPlayerTx: (playerId) => request(`/transactions/player/${playerId}`),
};

export const playersApi = {
  list: (search) => request(`/players${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  get: (id) => request(`/players/${id}`),
  create: (d) => request('/players', { method: 'POST', body: d }),
  update: (id, d) => request(`/players/${id}`, { method: 'PUT', body: d }),
  history: (id) => request(`/players/${id}/history`),
  rollingBalances: () => request('/players/balances/rolling'),
  sendReminder: (playerId, msg) => request(`/players/reminder/${playerId}`, { method: 'POST', body: { message: msg } }),
  sendSummary: (playerId, msg) => request(`/players/send-summary/${playerId}`, { method: 'POST', body: { message: msg } }),
};

export const statsApi = {
  hostDashboard: () => request('/stats/host-dashboard'),
  myStats: () => request('/stats/my-stats'),
  gameHistory: () => request('/stats/game-history'),
};

export const notificationsApi = {
  getInbox: () => request('/notifications/inbox'),
  markRead: (id) => request(`/notifications/inbox/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/notifications/inbox/read-all', { method: 'PUT' }),
  toggleWhatsapp: (enabled) => request('/notifications/whatsapp-toggle', { method: 'PUT', body: { enabled } }),
  getPreferences: () => request('/notifications/preferences'),
};

export const exportApi = {
  downloadGame: async (gameId) => {
    const res = await request(`/export/game/${gameId}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game_export_${gameId.slice(0, 8)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// Points formatter — no currency symbols
export const fmtPts = (amount, showSign = false) => {
  const n = parseFloat(amount) || 0;
  const abs = Math.abs(n);
  if (showSign && n !== 0) return `${n > 0 ? '+' : '-'}${abs} pts`;
  return `${n < 0 ? '-' : ''}${abs} pts`;
};
