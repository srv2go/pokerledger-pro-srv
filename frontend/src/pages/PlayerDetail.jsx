import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { playersApi } from '../services/api';
import { Card, Button, EmptyState, LoadingScreen } from '../components/ui';
import { BottomNav } from './Dashboard';
import { fmtPts, fmtTime } from '../hooks';
import { ArrowLeft, Mail, Phone, Trophy } from 'lucide-react';

export default function PlayerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [playerRes, historyRes] = await Promise.all([
          playersApi.get(id),
          playersApi.history(id),
        ]);
        setPlayer(playerRes.player);
        setHistory(historyRes.games || []);
        setStats(historyRes.stats || null);
      } catch {
        setPlayer(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  if (loading) return <LoadingScreen />;

  if (!player) {
    return (
      <div className="min-h-screen bg-[var(--color-gray-50)] pb-28 px-4 py-6">
        <EmptyState icon={Trophy} title="Player not found" description="This profile may have been removed." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/players')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Player Profile</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="px-4 py-6 page-enter">
        <div className="max-w-5xl mx-auto space-y-4">
          <Card className="p-4">
            <p className="text-xl font-semibold text-[var(--color-text-primary)]">{player.displayName}</p>
            <div className="mt-2 text-sm text-[var(--color-text-secondary)] space-y-1">
              {player.email && !player.email.includes('@temp.') && <p><Mail className="w-4 h-4 inline mr-2" />{player.email}</p>}
              {player.phone && <p><Phone className="w-4 h-4 inline mr-2" />{player.phone}</p>}
              <p>Role: {player.role}</p>
            </div>
          </Card>

          {stats && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3"><p className="text-xs text-gray-500">Games</p><p className="text-xl font-semibold text-[var(--color-text-primary)]">{stats.totalGames}</p></Card>
              <Card className="p-3"><p className="text-xs text-gray-500">Total Buy-in</p><p className="text-sm font-semibold text-[var(--color-text-primary)]">{fmtPts(stats.totalBuyIn)}</p></Card>
              <Card className="p-3"><p className="text-xs text-gray-500">Total Cash-out</p><p className="text-sm font-semibold text-[var(--color-text-primary)]">{fmtPts(stats.totalCashOut)}</p></Card>
              <Card className="p-3"><p className="text-xs text-gray-500">Net</p><p className={`text-sm font-semibold ${parseFloat(stats.totalProfit || 0) >= 0 ? 'chip-positive' : 'chip-negative'}`}>{fmtPts(stats.totalProfit, true)}</p></Card>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase mb-3">Recent Sessions</h2>
            {history.length === 0 ? (
              <Card className="p-4 text-sm text-[var(--color-text-secondary)]">No session history yet.</Card>
            ) : (
              history.slice(0, 20).map(row => (
                <Card key={row.id} className="p-4 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">{row.game?.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{fmtTime(row.game?.startTime)} • Session {row.session}</p>
                    </div>
                    <p className={`text-sm font-semibold ${parseFloat(row.finalBalance || 0) >= 0 ? 'chip-positive' : 'chip-negative'}`}>
                      {row.finalBalance !== null ? fmtPts(row.finalBalance, true) : '-'}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </section>
        </div>
      </main>

      <BottomNav current="/players" navigate={navigate} />
    </div>
  );
}