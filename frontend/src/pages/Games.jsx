import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGames, fmtPts, fmtTime } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge, LoadingScreen, EmptyState, Tabs } from '../components/ui';
import { BottomNav } from './Dashboard';
import { Layers, CalendarDays, Clock8, Users, PlayCircle, Trophy } from 'lucide-react';

const tabs = [
  { value: 'active', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
];

export default function GamesPage() {
  const navigate = useNavigate();
  const { isHost } = useAuth();
  const { games, loading } = useGames();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const [tab, setTab] = useState(tabParam && tabs.some(t => t.value === tabParam) ? tabParam : 'active');

  const filtered = useMemo(() => {
    switch (tab) {
      case 'scheduled':
        return games.filter(g => g.status === 'SCHEDULED');
      case 'completed':
        return games.filter(g => ['COMPLETED', 'ARCHIVED'].includes(g.status));
      default:
        return games.filter(g => ['ACTIVE', 'PAUSED'].includes(g.status));
    }
  }, [games, tab]);

  const updateTab = (next) => {
    setTab(next);
    params.set('tab', next);
    setParams(params, { replace: true });
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Sessions</p>
              <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Games & Schedules</h1>
            </div>
            {isHost && (
              <Button onClick={() => navigate('/create-game')}>
                <PlayCircle className="w-4 h-4" /> New Session
              </Button>
            )}
          </div>
          <div className="mt-4">
            <Tabs tabs={tabs} active={tab} onChange={updateTab} />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 page-enter">
        <div className="max-w-5xl mx-auto space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={tab === 'completed' ? Trophy : tab === 'scheduled' ? CalendarDays : Layers}
                title={tab === 'scheduled' ? 'No games scheduled' : tab === 'completed' ? 'No completed sessions yet' : 'No live sessions'}
                description={getEmptyDescription(tab, isHost)}
                action={isHost && tab !== 'completed' && (
                  <Button onClick={() => navigate('/create-game')}>
                    <PlayCircle className="w-4 h-4" /> Launch Session
                  </Button>
                )}
              />
            </Card>
          ) : (
            filtered.map(game => (
              <Card key={game.id} className="p-4 cursor-pointer hover:shadow-lg transition" onClick={() => navigate(`/game/${game.id}`)}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[var(--color-text-primary)]">{game.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{renderSubtitle(game, tab)}</p>
                  </div>
                  <Badge variant={statusVariant(game.status)}>{statusLabel(game.status)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {game._count?.players || game.players?.length || 0} players</span>
                  <span className="flex items-center gap-1"><Clock8 className="w-4 h-4" /> {fmtTime(game.startTime)}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      <BottomNav current="/games" navigate={navigate} />
    </div>
  );
}

function getEmptyDescription(tab, isHost) {
  if (tab === 'scheduled') return isHost ? 'Plan your next session to keep players engaged.' : 'Waiting on your host to schedule the next table.';
  if (tab === 'completed') return 'Completed sessions will show up here for quick exports.';
  return isHost ? 'Kick off a live session when players arrive.' : 'Live sessions from your hosts will appear here.';
}

function renderSubtitle(game, tab) {
  if (tab === 'scheduled') return new Date(game.startTime).toLocaleString();
  if (tab === 'completed') return `${fmtPts(game.totalPot || game.buyInAmount * (game.players?.length || 0))} total pot`;
  return `${game.gameType?.replace('_', ' ')} • ${fmtPts(game.buyInAmount)} buy-in`;
}

function statusVariant(status) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PAUSED') return 'warning';
  if (status === 'SCHEDULED') return 'info';
  return 'info';
}

function statusLabel(status) {
  const map = { ACTIVE: 'Live', PAUSED: 'Paused', SCHEDULED: 'Scheduled', COMPLETED: 'Completed', ARCHIVED: 'Archived' };
  return map[status] || status;
}
