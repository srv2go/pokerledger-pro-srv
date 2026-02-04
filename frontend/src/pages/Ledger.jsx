import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { statsApi, exportApi } from '../services/api';
import { Card, Button, EmptyState, LoadingScreen, Toast, StatCard } from '../components/ui';
import { BottomNav } from './Dashboard';
import { useToast, fmtPts, fmtTime } from '../hooks';
import { Download, FileSpreadsheet, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export default function LedgerPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [history, host] = await Promise.all([
          statsApi.gameHistory(),
          statsApi.hostDashboard().catch(() => null),
        ]);
        setGames(history.games || []);
        setSummary(host);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const totals = useMemo(() => {
    const all = games || [];
    const buyIn = all.reduce((sum, g) => sum + (parseFloat(g.totalBuyIn) || 0), 0);
    const cashOut = all.reduce((sum, g) => sum + (parseFloat(g.totalCashOut) || 0), 0);
    return { buyIn, cashOut, net: buyIn - cashOut };
  }, [games]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">Ledger</p>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Financial Overview</h1>
          </div>
          <Button variant="secondary" onClick={() => navigate('/history')}>
            <FileSpreadsheet className="w-4 h-4" /> History
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 page-enter">
        <div className="max-w-5xl mx-auto space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Buy-ins" value={fmtPts(totals.buyIn)} icon={Wallet} />
            <StatCard label="Total Cash-outs" value={fmtPts(totals.cashOut)} icon={TrendingDown} />
            <StatCard label="Net" value={fmtPts(totals.net, true)} icon={TrendingUp} />
            <StatCard label="Sessions" value={games.length} icon={FileSpreadsheet} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">Excel Exports</h2>
              <Button variant="ghost" onClick={() => toast.info('Upcoming: batched ledger export')}>Bulk Export</Button>
            </div>
            {games.length === 0 ? (
              <Card className="p-6">
                <EmptyState
                  icon={Download}
                  title="No sessions to export"
                  description="Wrap a session to generate a structured Excel report."
                />
              </Card>
            ) : (
              games.map(game => (
                <Card key={game.id} className="p-4 mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">{game.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{fmtTime(game.startTime)} • {game._count?.players || 0} players</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Pot {fmtPts(game.totalBuyIn)} • Rake {fmtPts(game.rake || 0)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => downloadGame(game.id, toast)}>
                      <Download className="w-4 h-4" /> Excel
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/game/${game.id}`)}>Open</Button>
                  </div>
                </Card>
              ))
            )}
          </section>
        </div>
      </main>

      <BottomNav current="/ledger" navigate={navigate} />
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}

async function downloadGame(gameId, toast) {
  try {
    await exportApi.downloadGame(gameId);
    toast.success('Export ready');
  } catch (e) {
    toast.error(e.message);
  }
}
