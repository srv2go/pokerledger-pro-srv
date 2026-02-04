import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { statsApi, exportApi } from '../services/api';
import { Card, Badge, EmptyState, LoadingScreen, Toast } from '../components/ui';
import { BottomNav } from './Dashboard';
import { useToast, fmtPts, fmtTime } from '../hooks';
import { Clock, Download, Users } from 'lucide-react';

export default function HistoryPage() {
  const nav = useNavigate();
  const { isHost } = useAuth();
  const toast = useToast();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limited, setLimited] = useState(false);

  useEffect(() => {
    statsApi.gameHistory().then(d => { setGames(d.games); setLimited(d.isLimited); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Game History</h1>
      </header>

      <main className="px-4 py-4 page-enter">
        {limited && <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">Free plan: Showing last 3 games only.</div>}

        {games.length === 0 ? (
          <EmptyState icon={Clock} title="No completed games" description="Games will appear here after completion" />
        ) : (
          <div className="space-y-2">
            {games.map(g => (
              <Card key={g.id} className="p-4 cursor-pointer hover:border-brand-200 transition" onClick={() => nav(`/game/${g.id}`)}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-[var(--color-text-primary)]">{g.name}</h3>
                  <Badge variant="info">{g.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                  <div className="flex items-center gap-3">
                    <span>{new Date(g.startTime).toLocaleDateString()}</span>
                    <span><Users className="w-3 h-3 inline" /> {g._count?.players || 0}</span>
                  </div>
                  {isHost && (
                    <button onClick={(e) => { e.stopPropagation(); exportApi.downloadGame(g.id).then(() => toast.success('Downloaded')).catch(e => toast.error(e.message)); }}
                      className="text-brand-600 hover:text-brand-500"><Download className="w-4 h-4" /></button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav current="/history" navigate={nav} />
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}
