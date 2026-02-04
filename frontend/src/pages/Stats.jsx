import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { statsApi, playersApi } from '../services/api';
import { Card, Button, Avatar, Badge, EmptyState, LoadingScreen, Toast, Tabs } from '../components/ui';
import { BottomNav } from './Dashboard';
import { useToast, fmtPts } from '../hooks';
import { BarChart3, Send, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function StatsPage() {
  const nav = useNavigate();
  const { user, isHost } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(isHost ? 'host' : 'personal');
  const [data, setData] = useState(null);
  const [personalData, setPersonalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isHost) { const d = await statsApi.hostDashboard(); setData(d); }
        const p = await statsApi.myStats(); setPersonalData(p);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [isHost]);

  const sendReminder = async (playerId, name) => {
    try { await playersApi.sendReminder(playerId); toast.success(`Reminder sent to ${name}`); }
    catch (e) { toast.error(e.message); }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Stats</h1>
        {isHost && (
          <div className="mt-3">
            <Tabs tabs={[{ value: 'host', label: 'Host Dashboard' }, { value: 'personal', label: 'My Stats' }]} active={tab} onChange={setTab} />
          </div>
        )}
      </header>

      <main className="px-4 py-4 page-enter">
        {tab === 'host' && data ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3"><p className="text-xs text-gray-500">Total Games</p><p className="text-2xl font-semibold text-[var(--color-text-primary)]">{data.totalGames}</p></Card>
              <Card className="p-3"><p className="text-xs text-gray-500">Total Players</p><p className="text-2xl font-semibold text-[var(--color-text-primary)]">{data.playerStats.length}</p></Card>
            </div>

            {/* Player Grid */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Player Balances</h2>
              {data.playerStats.length === 0 ? (
                <EmptyState icon={BarChart3} title="No data yet" description="Host games to see player stats" />
              ) : (
                <div className="space-y-2">
                  {data.playerStats.sort((a, b) => a.rollingBalance - b.rollingBalance).map(p => (
                    <Card key={p.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.displayName} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-text-primary)] truncate">{p.displayName}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{p.totalGames} games</span>
                            <span>In: {fmtPts(p.totalBuyIn)}</span>
                            <span>Out: {fmtPts(p.totalCashOut)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${p.rollingBalance >= 0 ? 'chip-positive' : 'chip-negative'}`}>
                            {fmtPts(p.rollingBalance, true)}
                          </p>
                          {p.owesHost && <p className="text-xs text-red-400">Owes {fmtPts(p.outstandingAmount)}</p>}
                        </div>
                      </div>
                      {p.owesHost && (
                        <div className="mt-2 flex justify-end">
                          <Button size="sm" variant="secondary" onClick={() => sendReminder(p.id, p.displayName)}>
                            <Send className="w-3 h-3" /> Send Reminder
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Game Summaries */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Game History</h2>
              {data.gameSummaries.map(g => (
                <Card key={g.id} className="p-3 mb-2 cursor-pointer hover:border-brand-200" onClick={() => nav(`/game/${g.id}`)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{g.name}</p>
                      <p className="text-xs text-gray-500">{new Date(g.date).toLocaleDateString()} • {g.playerCount} players</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-400">{fmtPts(g.totalBuyIn)} in</p>
                      {g.rake !== undefined && <p className="text-xs text-brand-600">Rake: {fmtPts(g.rake)}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          </div>
        ) : (
          <PersonalStats data={personalData} />
        )}
      </main>

      <BottomNav current="/stats" navigate={nav} />
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}

function PersonalStats({ data }) {
  if (!data) return <EmptyState icon={BarChart3} title="No stats" description="Play games to see your stats" />;

  const s = data.stats;
  return (
    <div className="space-y-4">
      {data.isLimited && <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">Free plan: Showing last 3 games. Upgrade for full history.</div>}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3"><p className="text-xs text-gray-500">Games Played</p><p className="text-2xl font-semibold text-[var(--color-text-primary)]">{s.totalGames}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-500">Win Rate</p><p className="text-2xl font-semibold text-[var(--color-text-primary)]">{s.winRate}%</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-500">Total Buy-in</p><p className="text-lg font-semibold text-[var(--color-text-primary)]">{fmtPts(s.totalBuyIn)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-500">Total Cash-out</p><p className="text-lg font-semibold text-[var(--color-text-primary)]">{fmtPts(s.totalCashOut)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Net P/L</p><p className={`text-lg font-bold ${s.totalProfit >= 0 ? 'chip-positive' : 'chip-negative'}`}>{fmtPts(s.totalProfit, true)}</p></Card>
        <Card className="p-3"><p className="text-xs text-gray-400">Best Win</p><p className="text-lg font-bold chip-positive">{fmtPts(s.biggestWin)}</p></Card>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Game History</h2>
        {data.games.map(g => (
          <Card key={g.id} className="p-3 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{g.game.name}</p>
                <p className="text-xs text-gray-500">{new Date(g.game.startTime).toLocaleDateString()} • {fmtPts(g.totalInvested)} in</p>
              </div>
              {g.finalBalance !== null && (
                <p className={`text-sm font-bold ${parseFloat(g.finalBalance) >= 0 ? 'chip-positive' : 'chip-negative'}`}>
                  {fmtPts(g.finalBalance, true)}
                </p>
              )}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
