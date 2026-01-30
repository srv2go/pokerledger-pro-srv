import { useState, useEffect, useCallback } from 'react';
import { gamesApi } from '../services/api';
import wsService from '../services/websocket';

/**
 * Hook for managing game state with real-time updates
 */
export const useGame = (gameId) => {
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const loadGame = useCallback(async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      const data = await gamesApi.get(gameId);
      setGame(data.game);
      setStats(data.stats);
      setIsHost(data.isHost);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadGame();

    // Join game room for real-time updates
    if (gameId) {
      wsService.joinGame(gameId);
    }

    return () => {
      wsService.leaveGame();
    };
  }, [gameId, loadGame]);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribeGameUpdate = wsService.on('GAME_UPDATE', (message) => {
      if (message.gameId === gameId) {
        setGame(prev => ({ ...prev, ...message.data }));
      }
    });

    const unsubscribeTransaction = wsService.on('TRANSACTION', (message) => {
      loadGame(); // Reload game data on transaction
    });

    const unsubscribeGameStatus = wsService.on('GAME_STATUS', (message) => {
      if (message.gameId === gameId) {
        setGame(prev => ({ ...prev, status: message.status }));
      }
    });

    return () => {
      unsubscribeGameUpdate();
      unsubscribeTransaction();
      unsubscribeGameStatus();
    };
  }, [gameId, loadGame]);

  return {
    game,
    stats,
    loading,
    error,
    isHost,
    refresh: loadGame,
  };
};

/**
 * Hook for managing games list
 */
export const useGames = (initialStatus = null) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGames = useCallback(async (status = initialStatus) => {
    try {
      setLoading(true);
      const params = {};
      if (status) params.status = status;
      const data = await gamesApi.list(params);
      setGames(data.games);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [initialStatus]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  return {
    games,
    loading,
    error,
    refresh: loadGames,
  };
};

/**
 * Hook for toast notifications
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  };
};

/**
 * Format currency
 */
export const formatCurrency = (amount, showSign = false) => {
  const num = parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  if (showSign && num !== 0) {
    return num > 0 ? `+${formatted}` : `-${formatted}`;
  }
  
  return num < 0 ? `-${formatted}` : formatted;
};

/**
 * Format relative time
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return then.toLocaleDateString();
};
