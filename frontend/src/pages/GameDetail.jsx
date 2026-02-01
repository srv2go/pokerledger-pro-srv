import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame, useToast, fmtPts } from '../hooks';
import { gamesApi, transactionsApi, playersApi, exportApi } from '../services/api';
import { Card, Button, Badge, Avatar, Modal, Input, Select, StatCard, LoadingScreen, Toast, EmptyState, Tabs } from '../components/ui';
import { ArrowLeft, Play, Pause, Square, Users, Plus, Clock, TrendingUp, UserPlus, Download, DollarSign, Send, MessageCircle, AlertCircle, RotateCcw, Search, X } from 'lucide-react';

const PAY_METHODS = [{ value: 'CASH', label: 'Cash' }, { value: 'VENMO', label: 'Venmo' }, { value: 'PAYPAL', label: 'PayPal' }, { value: 'ZELLE', label: 'Zelle' }, { value: 'OTHER', label: 'Other' }];
const EXP_TYPES = [{ value: 'FOOD', label: 'Food' }, { value: 'RENT', label: 'Rent' }, { value: 'DEALER', label: 'Dealer' }, { value: 'MISC', label: 'Misc' }];

export default function GameDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isHost: userIsHost } = useAuth();
  const { game, stats, loading, error, isHost, refresh } = useGame(id);
  const toast = useToast();
  const [modal, setModal] = useState(null); // 'buyin','cashout','addplayer','float','expense','tablecashout'
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingScreen />;
  if (error || !game) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="p-6 text-center"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><h2 className="text-lg font-bold text-white mb-2">Game Not Found</h2><Button onClick={() => nav('/')}>Back</Button></Card>
    </div>
  );

  const isLive = ['ACTIVE', 'PAUSED'].includes(game.status);
  const isCompleted = game.status === 'COMPLETED';
  const players = game.players || [];
  const activePlayers = players.filter(p => p.status === 'ACTIVE');
  const cashedOut = players.filter(p => p.status === 'CASHED_OUT');

  const doAction = async (fn) => { setBusy(true); try { await fn(); refresh(); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      <header className="sticky-header px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-gray-800"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">{game.name}</h1>
            <p className="text-xs text-gray-400">{game.blindsSmall}/{game.blindsBig} • {game.gameType?.replace('_', ' ')}</p>
          </div>
          <StatusBadge status={game.status} />
        </div>
      </header>

      <main className="px-4 py-4 space-y-5 page-enter">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Players" value={activePlayers.length} icon={Users} />
          <StatCard label="Total Pot" value={fmtPts(stats?.totalPot)} icon={DollarSign} />
          <StatCard label="Avg Stack" value={fmtPts(stats?.averageStack)} icon={TrendingUp} />
        </div>

        {/* Rake tally (host/admin only) */}
        {isHost && stats?.tallyCheck && (
          <Card className="p-3">
            <p className="text-xs font-semibold text-gray-400 mb-2">TALLY (Float + Buy-ins) - Cash-outs - Expenses = Rake</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Float + Buy-ins:</span> <span className="text-white">{fmtPts(stats.tallyCheck.floatPlusBuyIns)}</span></div>
              <div><span className="text-gray-500">Cash-outs:</span> <span className="text-white">{fmtPts(stats.tallyCheck.cashOuts)}</span></div>
              <div><span className="text-gray-500">Expenses:</span> <span className="text-white">{fmtPts(stats.tallyCheck.expenses)}</span></div>
              <div><span className="text-gray-500">Net Rake:</span> <span className="text-felt-400 font-bold">{fmtPts(stats.tallyCheck.expectedRake)}</span></div>
            </div>
          </Card>
        )}

        {/* Game Controls */}
        {isHost && (
          <div className="flex flex-wrap gap-2">
            {game.status === 'SCHEDULED' && <Button onClick={() => doAction(() => gamesApi.start(id))} loading={busy} className="flex-1"><Play className="w-4 h-4" /> Start</Button>}
            {game.status === 'ACTIVE' && <>
              <Button variant="secondary" onClick={() => doAction(() => gamesApi.pause(id))} loading={busy} className="flex-1"><Pause className="w-4 h-4" /> Pause</Button>
              <Button variant="danger" onClick={() => { if (confirm('End game?')) doAction(() => gamesApi.end(id)); }} loading={busy} className="flex-1"><Square className="w-4 h-4" /> End</Button>
            </>}
            {game.status === 'PAUSED' && <>
              <Button onClick={() => doAction(() => gamesApi.resume(id))} className="flex-1"><Play className="w-4 h-4" /> Resume</Button>
              <Button variant="danger" onClick={() => { if (confirm('End game?')) doAction(() => gamesApi.end(id)); }} className="flex-1"><Square className="w-4 h-4" /> End</Button>
            </>}
            {isLive && <>
              <Button variant="secondary" size="sm" onClick={() => setModal('tablecashout')}><Users className="w-4 h-4" /> Table Cash-out</Button>
              <Button variant="secondary" size="sm" onClick={() => setModal('float')}><RotateCcw className="w-4 h-4" /> Float</Button>
              <Button variant="secondary" size="sm" onClick={() => setModal('expense')}><DollarSign className="w-4 h-4" /> Expense</Button>
            </>}
            {isCompleted && <Button variant="secondary" onClick={() => exportApi.downloadGame(id)} className="flex-1"><Download className="w-4 h-4" /> Export Excel</Button>}
          </div>
        )}

        {/* Players */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase">Players ({players.length})</h2>
            {isHost && isLive && <Button size="sm" variant="ghost" onClick={() => setModal('addplayer')}><UserPlus className="w-4 h-4" /> Add</Button>}
          </div>

          {players.length === 0 ? (
            <Card className="p-6"><EmptyState icon={Users} title="No players" description="Add players to start" /></Card>
          ) : (
            <Card className="divide-y divide-gray-800">
              {players.map(gp => (
                <div key={gp.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={gp.player.displayName} />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${gp.status === 'ACTIVE' ? 'bg-felt-500' : gp.status === 'CASHED_OUT' ? 'bg-gray-500' : 'bg-amber-500'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{gp.player.displayName}</p>
                        <p className="text-xs text-gray-500">{gp.session > 1 ? `Session ${gp.session} • ` : ''}{fmtPts(gp.totalInvested)} in</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {gp.status === 'CASHED_OUT' ? (
                        <><p className="text-sm font-bold text-white">{fmtPts(gp.cashOut)} out</p>
                        <p className={`text-xs ${parseFloat(gp.finalBalance) >= 0 ? 'chip-positive' : 'chip-negative'}`}>{fmtPts(gp.finalBalance, true)}</p></>
                      ) : (
                        <p className="text-sm font-bold text-white">{fmtPts(gp.totalInvested)}</p>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  {isHost && isLive && (
                    <div className="mt-2 flex gap-2">
                      {gp.status === 'CASHED_OUT' ? (
                        <Button size="sm" variant="secondary" onClick={() => { setSelected(gp); setModal('buyin'); }} className="flex-1"><RotateCcw className="w-3 h-3" /> Rejoin</Button>
                      ) : gp.status === 'ACTIVE' ? (<>
                        <Button size="sm" variant="secondary" onClick={() => { setSelected(gp); setModal('buyin'); }} className="flex-1"><Plus className="w-3 h-3" /> Add</Button>
                        <Button size="sm" variant="secondary" onClick={() => { setSelected(gp); setModal('cashout'); }} className="flex-1"><Clock className="w-3 h-3" /> Cash Out</Button>
                      </>) : null}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </section>
      </main>

      {/* Modals */}
      <BuyInModal isOpen={modal === 'buyin'} onClose={() => { setModal(null); setSelected(null); }} gameId={id} player={selected} defaultAmt={game.buyInAmount} onDone={(m) => { refresh(); toast.success(m); }} onErr={toast.error} />
      <CashOutModal isOpen={modal === 'cashout'} onClose={() => { setModal(null); setSelected(null); }} gameId={id} player={selected} onDone={(m) => { refresh(); toast.success(m); }} onErr={toast.error} />
      <AddPlayerModal isOpen={modal === 'addplayer'} onClose={() => setModal(null)} gameId={id} existing={players.map(p => p.playerId)} defaultAmt={game.buyInAmount} onDone={(m) => { refresh(); toast.success(m); }} onErr={toast.error} />
      <FloatModal isOpen={modal === 'float'} onClose={() => setModal(null)} gameId={id} onDone={(m) => { refresh(); toast.success(m); }} onErr={toast.error} />
      <ExpenseModal isOpen={modal === 'expense'} onClose={() => setModal(null)} gameId={id} onDone={(m) => { refresh(); toast.success(m); }} onErr={toast.error} />
      <TableCashoutModal isOpen={modal === 'tablecashout'} onClose={() => setModal(null)} gameId={id} players={activePlayers} onDone={(m) => { refresh(); toast.success(m); }} onErr={toast.error} />
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}

function StatusBadge({ status }) {
  const m = { SCHEDULED: ['Scheduled', 'info'], ACTIVE: ['Live', 'success'], PAUSED: ['Paused', 'warning'], COMPLETED: ['Done', 'info'], CANCELLED: ['Cancelled', 'danger'] };
  const [l, v] = m[status] || [status, 'info'];
  return <Badge variant={v}>{l}</Badge>;
}

function BuyInModal({ isOpen, onClose, gameId, player, defaultAmt, onDone, onErr }) {
  const [amt, setAmt] = useState('');
  const [pay, setPay] = useState('CASH');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const isRejoin = player?.status === 'CASHED_OUT';
  const isRebuy = player && !isRejoin && parseFloat(player.totalInvested) > 0;

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const fn = isRebuy ? transactionsApi.topUp : transactionsApi.buyIn;
      await fn({ gameId, playerId: player?.player?.id || player?.playerId, amount: parseFloat(amt || defaultAmt), paymentMethod: pay, sendNotification: notify });
      onDone(`${isRejoin ? 'Rejoin' : isRebuy ? 'Top-up' : 'Buy-in'} recorded`);
      onClose(); setAmt('');
    } catch (e) { onErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRejoin ? 'Rejoin Game' : isRebuy ? 'Add Points' : 'Buy-in'}>
      <form onSubmit={submit} className="p-4 space-y-4">
        {player && <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"><Avatar name={player.player?.displayName} size="sm" /><div><p className="text-white font-medium text-sm">{player.player?.displayName}</p>{isRejoin && <p className="text-xs text-amber-400">Rejoining (Session {player.session + 1})</p>}</div></div>}
        <Input label="Amount (points)" type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder={String(parseFloat(defaultAmt))} required min="0.01" step="any" />
        <Select label="Payment" value={pay} onChange={e => setPay(e.target.value)} options={PAY_METHODS} />
        <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm text-gray-300">Send WhatsApp notification</span></label>
        <div className="flex gap-3"><Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button type="submit" loading={loading} className="flex-1">{isRejoin ? 'Rejoin' : isRebuy ? 'Add Points' : 'Buy-in'}</Button></div>
      </form>
    </Modal>
  );
}

function CashOutModal({ isOpen, onClose, gameId, player, onDone, onErr }) {
  const [amt, setAmt] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const invested = parseFloat(player?.totalInvested || 0);
  const profit = parseFloat(amt || 0) - invested;

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await transactionsApi.cashOut({ gameId, playerId: player.player?.id || player.playerId, amount: parseFloat(amt), sendNotification: notify });
      onDone('Cash-out recorded'); onClose(); setAmt('');
    } catch (e) { onErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cash Out">
      <form onSubmit={submit} className="p-4 space-y-4">
        {player && <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"><div className="flex items-center gap-3"><Avatar name={player.player?.displayName} size="sm" /><span className="text-white font-medium text-sm">{player.player?.displayName}</span></div><span className="text-gray-400 text-sm">{fmtPts(invested)} invested</span></div>}
        <Input label="Cash-out Amount (points)" type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" required min="0" step="any" />
        {amt && <div className={`p-3 rounded-lg ${profit >= 0 ? 'bg-felt-500/10' : 'bg-red-500/10'}`}><p className="text-xs text-gray-400">Net</p><p className={`text-xl font-bold ${profit >= 0 ? 'chip-positive' : 'chip-negative'}`}>{fmtPts(profit, true)}</p></div>}
        <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm text-gray-300">Send WhatsApp summary</span></label>
        <div className="flex gap-3"><Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button type="submit" loading={loading} className="flex-1">Cash Out</Button></div>
      </form>
    </Modal>
  );
}

function AddPlayerModal({ isOpen, onClose, gameId, existing, defaultAmt, onDone, onErr }) {
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(null);
  const [amt, setAmt] = useState('');
  const [loading, setLoading] = useState(false);

  const doSearch = async () => { try { const d = await playersApi.list(search); setResults(d.players.filter(p => !existing.includes(p.id))); } catch {} };

  const submit = async () => {
    if (!picked) return; setLoading(true);
    try {
      await transactionsApi.buyIn({ gameId, playerId: picked.id, amount: parseFloat(amt || defaultAmt) });
      onDone(`${picked.displayName} added`); onClose(); setPicked(null); setAmt(''); setSearch('');
    } catch (e) { onErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setPicked(null); }} title="Add Player" size="lg">
      {!picked ? (
        <>
          <div className="p-4 border-b border-gray-800"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input className="input pl-10" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} onFocus={() => results.length === 0 && doSearch()} /></div></div>
          <div className="max-h-72 overflow-y-auto">{results.map(p => (
            <div key={p.id} onClick={() => setPicked(p)} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 border-b border-gray-800/50">
              <Avatar name={p.displayName} size="sm" /><div><p className="text-sm font-medium text-white">{p.displayName}</p><p className="text-xs text-gray-500">{p.phone || p.email}</p></div>
            </div>
          ))}{results.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Search for players</div>}</div>
        </>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"><Avatar name={picked.displayName} size="sm" /><span className="text-white font-medium text-sm flex-1">{picked.displayName}</span><button onClick={() => setPicked(null)} className="text-gray-500"><X className="w-4 h-4" /></button></div>
          <Input label="Buy-in (points)" type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder={String(parseFloat(defaultAmt))} />
          <div className="flex gap-3"><Button variant="secondary" onClick={() => setPicked(null)} className="flex-1">Back</Button><Button onClick={submit} loading={loading} className="flex-1">Add</Button></div>
        </div>
      )}
    </Modal>
  );
}

function FloatModal({ isOpen, onClose, gameId, onDone, onErr }) {
  const [amt, setAmt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await gamesApi.addFloat(gameId, { amount: parseFloat(amt), notes }); onDone('Float added'); onClose(); setAmt(''); setNotes(''); }
    catch (e) { onErr(e.message); } finally { setLoading(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Float">
      <form onSubmit={submit} className="p-4 space-y-4">
        <p className="text-sm text-gray-400">Buffer/escrow chips with dealer</p>
        <Input label="Amount (points)" type="number" value={amt} onChange={e => setAmt(e.target.value)} required min="0.01" step="any" />
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
        <div className="flex gap-3"><Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button type="submit" loading={loading} className="flex-1">Add Float</Button></div>
      </form>
    </Modal>
  );
}

function ExpenseModal({ isOpen, onClose, gameId, onDone, onErr }) {
  const [cat, setCat] = useState('FOOD');
  const [amt, setAmt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await gamesApi.addExpense(gameId, { category: cat, amount: parseFloat(amt), notes }); onDone('Expense added'); onClose(); setAmt(''); setNotes(''); }
    catch (e) { onErr(e.message); } finally { setLoading(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
      <form onSubmit={submit} className="p-4 space-y-4">
        <Select label="Category" value={cat} onChange={e => setCat(e.target.value)} options={EXP_TYPES} />
        <Input label="Amount (points)" type="number" value={amt} onChange={e => setAmt(e.target.value)} required min="0" step="any" />
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
        <div className="flex gap-3"><Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button type="submit" loading={loading} className="flex-1">Add</Button></div>
      </form>
    </Modal>
  );
}

function TableCashoutModal({ isOpen, onClose, gameId, players, onDone, onErr }) {
  const [cashOuts, setCashOuts] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const setCO = (pid, val) => setCashOuts({ ...cashOuts, [pid]: val });
  const addExpense = () => setExpenses([...expenses, { category: 'FOOD', amount: '', notes: '' }]);
  const setExp = (i, k, v) => { const e = [...expenses]; e[i] = { ...e[i], [k]: v }; setExpenses(e); };

  const submit = async () => {
    setLoading(true);
    try {
      const coArr = Object.entries(cashOuts).filter(([, v]) => v !== '').map(([pid, v]) => ({ playerId: pid, amount: parseFloat(v) }));
      const expArr = expenses.filter(e => e.amount).map(e => ({ ...e, amount: parseFloat(e.amount) }));
      await gamesApi.tableCashout(gameId, { cashOuts: coArr, expenses: expArr });
      onDone('Table cash-out complete'); onClose(); setCashOuts({}); setExpenses([]);
    } catch (e) { onErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Table Cash-out" size="lg">
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        <p className="text-sm text-gray-400">Enter cash-out amount for each player</p>
        {players.map(gp => (
          <div key={gp.playerId} className="flex items-center gap-3">
            <Avatar name={gp.player.displayName} size="sm" />
            <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{gp.player.displayName}</p><p className="text-xs text-gray-500">{fmtPts(gp.totalInvested)} in</p></div>
            <input type="number" className="input w-28 text-right" placeholder="0" value={cashOuts[gp.playerId] || ''} onChange={e => setCO(gp.playerId, e.target.value)} min="0" step="any" />
          </div>
        ))}

        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-400">Expenses</h4>
            <Button size="sm" variant="ghost" onClick={addExpense}><Plus className="w-3 h-3" /> Add</Button>
          </div>
          {expenses.map((exp, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <select className="input w-28" value={exp.category} onChange={e => setExp(i, 'category', e.target.value)}>{EXP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
              <input type="number" className="input flex-1" placeholder="Amount" value={exp.amount} onChange={e => setExp(i, 'amount', e.target.value)} min="0" step="any" />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2"><Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button onClick={submit} loading={loading} className="flex-1">Confirm All</Button></div>
      </div>
    </Modal>
  );
}
