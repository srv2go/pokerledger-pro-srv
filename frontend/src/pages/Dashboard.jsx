import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGames, formatCurrency, formatRelativeTime } from '../hooks';
import { 
  Card, Button, Badge, Avatar, StatCard, 
  EmptyState, LoadingScreen 
} from '../components/ui';
import { 
  Plus, Play, Users, DollarSign, Clock, 
  Calendar, TrendingUp, MoreVertical, Spade,
  ChevronRight, Bell
} from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { games, loading, error, refresh } = useGames();
  const navigate = useNavigate();

  const activeGames = games.filter(g => g.status === 'ACTIVE');
  const scheduledGames = games.filter(g => g.status === 'SCHEDULED');
  const recentGames = games.filter(g => g.status === 'COMPLETED').slice(0, 3);

  // Calculate stats
  const totalPot = activeGames.reduce((sum, g) => sum + parseFloat(g._sum?.totalInvested || 0), 0);
  const totalPlayers = activeGames.reduce((sum, g) => sum + (g._count?.players || 0), 0);

  if (loading) {
    return <LoadingScreen message="Loading your games..." />;
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-felt-500 to-felt-700 flex items-center justify-center">
              <Spade className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">PokerLedger</h1>
              <p className="text-xs text-gray-400">Welcome, {user?.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-800 relative">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-felt-500 rounded-full" />
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="p-1"
            >
              <Avatar name={user?.displayName} size="sm" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            label="Active Games" 
            value={activeGames.length}
            icon={Play}
          />
          <StatCard 
            label="Total in Play" 
            value={formatCurrency(totalPot)}
            icon={DollarSign}
          />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/games/new')}
            className="flex-1"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            New Game
          </Button>
          <Button 
            variant="secondary"
            onClick={() => navigate('/players')}
            className="flex-1"
            size="lg"
          >
            <Users className="w-5 h-5" />
            Players
          </Button>
        </div>

        {/* Active Games */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Active Games</h2>
            {activeGames.length > 0 && (
              <Link to="/games?status=ACTIVE" className="text-sm text-felt-400 flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {activeGames.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={Play}
                title="No active games"
                description="Start a new game or check your scheduled games"
                action={
                  <Button onClick={() => navigate('/games/new')} size="sm">
                    <Plus className="w-4 h-4" /> Start Game
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {activeGames.map(game => (
                <GameCard key={game.id} game={game} onClick={() => navigate(`/games/${game.id}`)} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Games */}
        {scheduledGames.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Upcoming</h2>
              <Link to="/games?status=SCHEDULED" className="text-sm text-felt-400 flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {scheduledGames.slice(0, 3).map(game => (
                <UpcomingGameRow key={game.id} game={game} onClick={() => navigate(`/games/${game.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        {recentGames.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-3">Recent Games</h2>
            <Card className="divide-y divide-gray-800">
              {recentGames.map(game => (
                <div 
                  key={game.id} 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800/50"
                  onClick={() => navigate(`/games/${game.id}`)}
                >
                  <div>
                    <p className="font-medium text-white">{game.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(game.endTime).toLocaleDateString()} • {game._count?.players || 0} players
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              ))}
            </Card>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-area-bottom">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          <NavItem icon={Spade} label="Games" active />
          <NavItem icon={Users} label="Players" onClick={() => navigate('/players')} />
          <NavItem icon={TrendingUp} label="Stats" onClick={() => navigate('/stats')} />
          <NavItem icon={Calendar} label="History" onClick={() => navigate('/history')} />
        </div>
      </nav>
    </div>
  );
}

// Game Card Component
function GameCard({ game, onClick }) {
  const playerCount = game._count?.players || game.players?.length || 0;
  const totalPot = parseFloat(game._sum?.totalInvested || 0);

  return (
    <Card hover className="p-4 cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-white">{game.name}</h3>
          <p className="text-sm text-gray-400">
            {game.gameType?.replace('_', ' ')} • ${game.blindsSmall}/${game.blindsBig}
          </p>
        </div>
        <Badge variant="success">Live</Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{playerCount}</p>
          <p className="text-xs text-gray-400">Players</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-felt-400 chip-amount">{formatCurrency(totalPot)}</p>
          <p className="text-xs text-gray-400">Total Pot</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalPot / (playerCount || 1))}</p>
          <p className="text-xs text-gray-400">Avg Stack</p>
        </div>
      </div>
    </Card>
  );
}

// Upcoming Game Row
function UpcomingGameRow({ game, onClick }) {
  const startTime = new Date(game.startTime);
  
  return (
    <Card 
      hover 
      className="p-3 flex items-center gap-3 cursor-pointer" 
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-lg bg-felt-500/20 flex flex-col items-center justify-center">
        <span className="text-xs text-felt-400 font-bold uppercase">
          {startTime.toLocaleDateString('en', { month: 'short' })}
        </span>
        <span className="text-lg font-bold text-white leading-none">
          {startTime.getDate()}
        </span>
      </div>
      <div className="flex-1">
        <p className="font-medium text-white">{game.name}</p>
        <p className="text-xs text-gray-400">
          {startTime.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })} • 
          ${game.buyInAmount} buy-in
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-500" />
    </Card>
  );
}

// Nav Item
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
        active 
          ? 'text-felt-400 bg-felt-500/10' 
          : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}
