import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGames, fmtPts, fmtTime } from '../hooks';
import { Card, Badge, Avatar, StatCard, LoadingScreen, EmptyState } from '../components/ui';
import { Plus, Users, BarChart3, Clock, Home, Inbox, Settings, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const { user, isHost } = useAuth();
  const { games, loading, refresh } = useGames();
  const navigate = useNavigate();
  const location = useLocation();

  const active = games.filter(g => ['ACTIVE', 'PAUSED'].includes(g.status));
  const scheduled = games.filter(g => g.status === 'SCHEDULED');
  const recent = games.filter(g => ['COMPLETED', 'ARCHIVED'].includes(g.status)).slice(0, 5);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header with safe area */}
      <header className="sticky-header px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">PokerLedger Pro</h1>
            <p className="text-xs text-gray-400">{user?.displayName} • <span className="capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</span></p>
          </div>
          {isHost && (
            <button onClick={() => navigate('/create-game')} className="w-10 h-10 bg-felt-600 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </header>

      <main className="px-4 py-4 space-y-6 page-enter">
        {/* Active Games */}
        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Live Games</h2>
            <div className="space-y-3">
              {active.map(g => (
                <Card key={g.id} className="p-4 cursor-pointer hover:border-felt-500 transition" onClick={() => navigate(`/game/${g.id}`)}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">{g.name}</h3>
                    <Badge variant={g.status === 'ACTIVE' ? 'success' : 'warning'}>{g.status === 'ACTIVE' ? 'Live' : 'Paused'}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span><Users className="w-3.5 h-3.5 inline mr-1" />{g._count?.players || g.players?.length || 0}</span>
                    <span>{fmtPts(g.buyInAmount)} buy-in</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Upcoming</h2>
            {scheduled.map(g => (
              <Card key={g.id} className="p-4 cursor-pointer hover:border-gray-700 transition mb-2" onClick={() => navigate(`/game/${g.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{g.name}</h3>
                    <p className="text-sm text-gray-400">{fmtPts(g.buyInAmount)} buy-in • {new Date(g.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </div>
              </Card>
            ))}
          </section>
        )}

        {/* Recent Completed */}
        {recent.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Recent</h2>
            {recent.map(g => (
              <Card key={g.id} className="p-4 cursor-pointer hover:border-gray-700 transition mb-2" onClick={() => navigate(`/game/${g.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{g.name}</h3>
                    <p className="text-sm text-gray-400">{fmtTime(g.startTime)} • {g._count?.players || 0} players</p>
                  </div>
                  <Badge variant="info">Done</Badge>
                </div>
              </Card>
            ))}
          </section>
        )}

        {/* Empty state */}
        {games.length === 0 && (
          <EmptyState
            icon={Home}
            title="No games yet"
            description={isHost ? "Create your first game to get started" : "You'll see games here once a host adds you"}
            action={isHost && <button onClick={() => navigate('/create-game')} className="btn-primary">Create Game</button>}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav current={location.pathname} navigate={navigate} isHost={isHost} />
    </div>
  );
}

export function BottomNav({ current, navigate, isHost }) {
  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/players', icon: Users, label: 'Players' },
    { path: '/stats', icon: BarChart3, label: 'Stats' },
    { path: '/history', icon: Clock, label: 'History' },
    { path: '/inbox', icon: Inbox, label: 'Inbox' },
    { path: '/profile', icon: Settings, label: 'Profile' },
  ];

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 pt-2">
        {tabs.map(t => {
          const active = current === t.path;
          return (
            <button key={t.path} onClick={() => navigate(t.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 min-w-[48px] ${active ? 'text-felt-400' : 'text-gray-500'}`}>
              <t.icon className="w-5 h-5" />
              <span className="text-[10px]">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
