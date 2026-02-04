import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGames, fmtPts, fmtTime } from '../hooks';
import { Card, Badge, StatCard, LoadingScreen, EmptyState, Button } from '../components/ui';
import {
  PlayCircle,
  Zap,
  Users,
  BellDot,
  CalendarDays,
  Clock8,
  Wallet,
  FileBarChart,
  Settings,
  Home as HomeIcon,
  ClipboardList,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export default function Dashboard() {
  const { user, isHost } = useAuth();
  const { games, loading } = useGames();
  const navigate = useNavigate();
  const location = useLocation();

  const active = useMemo(() => games.filter(g => ['ACTIVE', 'PAUSED'].includes(g.status)), [games]);
  const scheduled = useMemo(() => games.filter(g => g.status === 'SCHEDULED'), [games]);
  const recent = useMemo(() => games.filter(g => ['COMPLETED', 'ARCHIVED'].includes(g.status)).slice(0, 4), [games]);

  const outstandingBalances = useMemo(() => {
    return games.reduce((sum, g) => sum + (parseFloat(g.expectedRake || g.totalRakeDue) || 0), 0);
  }, [games]);

  const nextSession = scheduled[0];
  const today = new Date();

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <p className="text-xs text-[var(--color-text-secondary)]">LedgerAI • {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Command Center</h1>
          </div>
          {isHost && (
            <Button onClick={() => navigate('/create-game')} className="shadow-lg">
              <PlayCircle className="w-4 h-4" /> Launch Session
            </Button>
          )}
        </div>
      </header>

      <main className="px-4 py-6 page-enter">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Hero / automation health */}
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2 p-5 bg-gradient-to-r from-brand-500 to-brand-700 text-white border-none">
              <p className="text-sm uppercase tracking-wide opacity-80 mb-2">Welcome back</p>
              <h2 className="text-2xl font-semibold mb-2">{user?.displayName}</h2>
              <p className="text-sm text-white/80">Stay ahead of every session: monitor float, automations, and ledger health from a single view.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" className="bg-white/15 text-white border-white/30" onClick={() => navigate('/automations')}>
                  <Zap className="w-4 h-4" /> Automations
                </Button>
                <Button variant="secondary" className="bg-white/15 text-white border-white/30" onClick={() => navigate('/ledger')}>
                  <Wallet className="w-4 h-4" /> Ledger
                </Button>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Automation Health</p>
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Stable</h3>
                </div>
                <ShieldCheck className="w-6 h-6 text-brand-500" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">All workflows dispatched as scheduled in the last 24h.</p>
            </Card>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Live Sessions" value={active.length} icon={Layers} />
            <StatCard label="Upcoming" value={scheduled.length} icon={CalendarDays} />
            <StatCard label="Outstanding Bal." value={fmtPts(outstandingBalances, true)} icon={Wallet} />
            <StatCard label="Recent Wraps" value={recent.length} icon={ClipboardList} />
          </section>

          {/* Active sessions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">Active Sessions</h2>
              {isHost && active.length > 0 && <Button variant="ghost" onClick={() => navigate('/games')}>View all</Button>}
            </div>
            {active.length === 0 ? (
              <Card className="p-5">
                <EmptyState
                  icon={Home}
                  title="No live sessions"
                  description={isHost ? 'Schedule a session or resume a paused table.' : 'Your hosts will display sessions here.'}
                  action={isHost && <Button onClick={() => navigate('/create-game')}><PlayCircle className="w-4 h-4" /> Launch Session</Button>}
                />
              </Card>
            ) : (
              <div className="grid gap-3">
                {active.map(session => (
                  <Card key={session.id} className="p-4 cursor-pointer hover:shadow-lg transition" onClick={() => navigate(`/game/${session.id}`)}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{session.name}</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">{session.gameType?.replace('_', ' ')} • {fmtPts(session.buyInAmount)} buy-in</p>
                      </div>
                      <Badge variant={session.status === 'ACTIVE' ? 'success' : 'warning'}>{session.status === 'ACTIVE' ? 'Live' : 'Paused'}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {session._count?.players || session.players?.length || 0}</span>
                      <span className="flex items-center gap-1"><BellDot className="w-4 h-4" /> {session.pendingNotifications || 0} alerts</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming */}
          {isHost && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">Upcoming Schedule</h2>
                {scheduled.length > 0 && <Button variant="ghost" onClick={() => navigate('/games?tab=scheduled')}>Manage</Button>}
              </div>
              {scheduled.length === 0 ? (
                <Card className="p-5">
                  <p className="text-sm text-[var(--color-text-secondary)]">Nothing on the calendar yet.</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {scheduled.slice(0, 3).map(game => (
                    <Card key={game.id} className="p-4 flex items-center justify-between cursor-pointer" onClick={() => navigate(`/game/${game.id}`)}>
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">{game.name}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{new Date(game.startTime).toLocaleString()}</p>
                      </div>
                      <CalendarDays className="w-5 h-5 text-brand-500" />
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Recent wrap ups */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">Recent Wrap-ups</h2>
              {recent.length > 0 && <Button variant="ghost" onClick={() => navigate('/ledger')}>Open Ledger</Button>}
            </div>
            {recent.length === 0 ? (
              <Card className="p-5">
                <p className="text-sm text-[var(--color-text-secondary)]">No completed sessions yet.</p>
              </Card>
            ) : (
              <div className="grid gap-2">
                {recent.map(game => (
                  <Card key={game.id} className="p-4 flex items-center justify-between cursor-pointer" onClick={() => navigate(`/game/${game.id}`)}>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{game.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{fmtTime(game.startTime)} • {game._count?.players || 0} players</p>
                    </div>
                    <Badge variant="info">Done</Badge>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <BottomNav current={location.pathname} navigate={navigate} />
    </div>
  );
}

export function BottomNav({ current, navigate }) {
  const tabs = [
    { path: '/', icon: HomeIcon, label: 'Home' },
    { path: '/games', icon: Layers, label: 'Games' },
    { path: '/players', icon: Users, label: 'Players' },
    { path: '/ledger', icon: Wallet, label: 'Ledger' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 pt-2">
        {tabs.map(tab => {
          const active = current === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[56px] ${active ? 'text-brand-600' : 'text-[var(--color-text-secondary)]'}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
