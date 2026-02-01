import { useState, useEffect, useCallback } from 'react';
import { gamesApi } from '../services/api';
import wsService from '../services/websocket';

export const useGame = (gameId) => {
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const load = useCallback(async () => {
    if (!gameId) return;
    try { setLoading(true); const d = await gamesApi.get(gameId); setGame(d.game); setStats(d.stats); setIsHost(d.isHost); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [gameId]);

  useEffect(() => { load(); if (gameId) wsService.joinGame(gameId); return () => wsService.leaveGame(); }, [gameId, load]);

  useEffect(() => {
    const u1 = wsService.on('TRANSACTION', () => load());
    const u2 = wsService.on('GAME_UPDATE', (m) => { if (m.gameId === gameId) load(); });
    return () => { u1(); u2(); };
  }, [gameId, load]);

  return { game, stats, loading, error, isHost, refresh: load };
};

export const useGames = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (status) => {
    try { setLoading(true); const d = await gamesApi.list(status ? { status } : {}); setGames(d.games); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { games, loading, refresh: load };
};

export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'info', ms = 4000) => {
    const id = Date.now();
    setToasts(p => [...p, { id, message: msg, type }]);
    if (ms > 0) setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms);
    return id;
  }, []);
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove, success: (m) => add(m, 'success'), error: (m) => add(m, 'error'), info: (m) => add(m, 'info') };
};

export const fmtPts = (amount, showSign = false) => {
  const n = parseFloat(amount) || 0;
  const abs = Math.abs(n);
  if (showSign && n !== 0) return `${n > 0 ? '+' : '-'}${abs} pts`;
  return `${n < 0 ? '-' : ''}${abs} pts`;
};

export const fmtTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = (now - d) / 60000;
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${Math.floor(diff)}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
