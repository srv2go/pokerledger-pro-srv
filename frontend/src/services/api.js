/**
 * API Service for PokerLedger Pro
 * Simplified flow: Host records all transactions, players get WhatsApp notifications
 */

const API_BASE = 'https://pokerledger-backend.onrender.com/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

const getToken = () => localStorage.getItem('token');

const request = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    // Handle validation errors array
    let errorMessage = data?.error || data?.message || 'Request failed';
    if (data?.errors && Array.isArray(data.errors)) {
      errorMessage = data.errors.map(e => e.msg || e.message).join(', ');
    }
    throw new ApiError(
      errorMessage,
      response.status,
      data
    );
  }

  return data;
};

// Auth API
export const authApi = {
  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: userData,
  }),

  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: credentials,
  }),

  getProfile: () => request('/auth/me'),

  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: data,
  }),

  refreshToken: () => request('/auth/refresh', {
    method: 'POST',
  }),
};

// Games API
export const gamesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/games${query ? `?${query}` : ''}`);
  },

  get: (id) => request(`/games/${id}`),

  create: (gameData) => request('/games', {
    method: 'POST',
    body: gameData,
  }),

  update: (id, gameData) => request(`/games/${id}`, {
    method: 'PUT',
    body: gameData,
  }),

  delete: (id) => request(`/games/${id}`, {
    method: 'DELETE',
  }),

  start: (id) => request(`/games/${id}/start`, {
    method: 'POST',
  }),

  pause: (id) => request(`/games/${id}/pause`, {
    method: 'POST',
  }),

  resume: (id) => request(`/games/${id}/resume`, {
    method: 'POST',
  }),

  end: (id) => request(`/games/${id}/end`, {
    method: 'POST',
  }),

  invite: (id, playerIds, sendNotification = true) => request(`/games/${id}/invite`, {
    method: 'POST',
    body: { playerIds, sendNotification },
  }),
};

// Players API
export const playersApi = {
  list: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/players${query}`);
  },

  get: (id) => request(`/players/${id}`),

  create: (playerData) => request('/players', {
    method: 'POST',
    body: playerData,
  }),

  update: (id, playerData) => request(`/players/${id}`, {
    method: 'PUT',
    body: playerData,
  }),

  history: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/players/${id}/history${query ? `?${query}` : ''}`);
  },
};

// Transactions API - Host records all, players get WhatsApp notifications
export const transactionsApi = {
  /**
   * Record buy-in (initial or re-buy)
   * @param {Object} data - { gameId, playerId, amount, paymentMethod?, sendNotification? }
   */
  buyIn: (data) => request('/transactions/buy-in', {
    method: 'POST',
    body: { sendNotification: true, ...data },
  }),

  /**
   * Record top-up (adds chips to player's stack)
   * @param {Object} data - { gameId, playerId, amount, paymentMethod?, sendNotification? }
   */
  topUp: (data) => request('/transactions/top-up', {
    method: 'POST',
    body: { sendNotification: true, ...data },
  }),

  /**
   * Record cash-out
   * @param {Object} data - { gameId, playerId, amount, sendNotification? }
   */
  cashOut: (data) => request('/transactions/cash-out', {
    method: 'POST',
    body: { sendNotification: true, ...data },
  }),

  /**
   * Record balance adjustment
   * @param {Object} data - { gameId, playerId, amount, reason }
   */
  adjustment: (data) => request('/transactions/adjustment', {
    method: 'POST',
    body: data,
  }),

  /**
   * Get transactions for a game
   */
  getGameTransactions: (gameId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/transactions/game/${gameId}${query ? `?${query}` : ''}`);
  },

  /**
   * Get transaction history for a player
   */
  getPlayerTransactions: (playerId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/transactions/player/${playerId}${query ? `?${query}` : ''}`);
  },
};

// Notifications API
export const notificationsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notifications${query ? `?${query}` : ''}`);
  },

  markRead: (id) => request(`/notifications/${id}/read`, {
    method: 'PUT',
  }),

  markAllRead: () => request('/notifications/read-all', {
    method: 'PUT',
  }),

  delete: (id) => request(`/notifications/${id}`, {
    method: 'DELETE',
  }),

  getPreferences: () => request('/notifications/preferences'),

  updatePreferences: (preferences) => request('/notifications/preferences', {
    method: 'PUT',
    body: { preferences },
  }),
};

export { ApiError };
export default { authApi, gamesApi, playersApi, transactionsApi, notificationsApi };
