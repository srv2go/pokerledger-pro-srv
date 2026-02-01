class WsService {
  constructor() { this.ws = null; this.listeners = new Map(); this.reconnectTimer = null; this.gameId = null; }
  connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws.onopen = () => { this.ws.send(JSON.stringify({ type: 'AUTH', token })); if (this.gameId) this.joinGame(this.gameId); };
    this.ws.onmessage = (e) => { try { const msg = JSON.parse(e.data); this.emit(msg.type, msg); } catch {} };
    this.ws.onclose = () => { this.reconnectTimer = setTimeout(() => this.connect(token), 3000); };
  }
  disconnect() { clearTimeout(this.reconnectTimer); this.ws?.close(); this.ws = null; }
  joinGame(id) { this.gameId = id; if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'JOIN_GAME', gameId: id })); }
  leaveGame() { if (this.ws?.readyState === WebSocket.OPEN && this.gameId) this.ws.send(JSON.stringify({ type: 'LEAVE_GAME' })); this.gameId = null; }
  on(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); return () => this.listeners.get(type)?.delete(fn); }
  emit(type, data) { this.listeners.get(type)?.forEach(fn => fn(data)); }
}
export default new WsService();
