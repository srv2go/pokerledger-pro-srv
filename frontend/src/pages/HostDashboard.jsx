import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gamesApi, playersApi } from '../services/api';
import { useGames } from '../hooks';
import { formatCurrency } from '../utils/currency';
import { 
  Card, Button, Badge, Avatar, StatCard, 
  EmptyState, LoadingScreen, Modal, Input
} from '../components/ui';
import { 
  Plus, Play, Users, DollarSign, Clock, 
  Calendar, TrendingUp, MoreVertical, Spade,
  ChevronRight, Bell, AlertCircle, TrendingDown
} from 'lucide-react';

export default function HostDashboard() {
  const { user, logout } = useAuth();
  const { games, loading, error, refresh } = useGames();
  const navigate = useNavigate();
  const [showPlayerSettlement, setShowPlayerSettlement] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Only show if user is HOST or ADMIN
  if (user?.role === 'PLAYER') {
    return <DashboardPlayer />;
  }

  const activeGames = games.filter(g => g.status === 'ACTIVE');
  const allPlayers = new Map();

  // Aggregate player settlement status across all games
  activeGames.forEach(game => {
    game.players?.forEach(gp => {
      if (!allPlayers.has(gp.playerId)) {
        allPlayers.set(gp.playerId, {
          ...gp.player,
          totalInvested: 0,
          totalCashOut: 0,
          gamesActive: 0
        });
      }
      const existing = allPlayers.get(gp.playerId);
      existing.totalInvested += parseFloat(gp.totalInvested || 0);
      existing.totalCashOut += parseFloat(gp.cashOut || 0);
      existing.gamesActive++;
    });
  });

  // Calculate settlement status for each player
  const playersSettlementStatus = Array.from(allPlayers.values()).map(p => ({
    ...p,
    balanceDue: p.totalInvested - p.totalCashOut,
    status: p.totalInvested > p.totalCashOut ? 'OWES' : p.totalCashOut > p.totalInvested ? 'OWED' : 'SETTLED'
  }));

  // Sort by balance owed (highest debtors first)
  const sortedPlayers = playersSettlementStatus.sort((a, b) => b.balanceDue - a.balanceDue);

  if (loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen pb-24 bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white text-lg">Host Dashboard</h1>
            <p className="text-xs text-gray-400">{user?.displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/profile')}
              className="p-2 rounded-lg hover:bg-gray-800"
            >
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard 
            label="Active Games"
            value={activeGames.length}
            icon={Play}
            color="text-felt-400"
          />
          <StatCard 
            label="Players"
            value={sortedPlayers.length}
            icon={Users}
            color="text-blue-400"
          />
          <StatCard 
            label="Unsettled"
            value={sortedPlayers.filter(p => p.status === 'OWES').length}
            icon={AlertCircle}
            color="text-red-400"
          />
        </div>

        {/* Active Games */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Active Games</h2>
            <Button size="sm" onClick={() => navigate('/games/new')}>
              <Plus className="w-4 h-4" /> New Game
            </Button>
          </div>
          
          {activeGames.length === 0 ? (
            <EmptyState 
              title="No active games"
              description="Create a new game to get started"
              action={() => navigate('/games/new')}
            />
          ) : (
            <div className="space-y-2">
              {activeGames.map(game => (
                <Card 
                  key={game.id}
                  className="p-3 cursor-pointer hover:bg-gray-800/50"
                  onClick={() => navigate(`/games/${game.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{game.name}</p>
                      <p className="text-xs text-gray-400">
                        {game._count?.players || 0} players • {formatCurrency(game.buyInAmount)}/{formatCurrency(game.blindsSmall)}/{formatCurrency(game.blindsBig)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Player Settlement Status */}
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Player Settlement Status</h2>
          
          {sortedPlayers.length === 0 ? (
            <EmptyState 
              title="No players"
              description="Players will appear here when they join a game"
            />
          ) : (
            <div className="space-y-2">
              {sortedPlayers.map(player => (
                <Card 
                  key={player.id}
                  className={`p-3 cursor-pointer ${
                    player.status === 'OWES' 
                      ? 'bg-red-500/10 border-red-500/20' 
                      : player.status === 'OWED'
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-gray-800/30'
                  }`}
                  onClick={() => {
                    setSelectedPlayer(player);
                    setShowPlayerSettlement(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={player.displayName} size="md" />
                    <div className="flex-1">
                      <p className="font-bold text-white">{player.displayName}</p>
                      <p className="text-xs text-gray-400">
                        Buy-in: {formatCurrency(player.totalInvested)} • Cash-out: {formatCurrency(player.totalCashOut)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        player.status === 'OWES' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {player.status === 'OWES' ? '- ' : '+ '}{formatCurrency(Math.abs(player.balanceDue))}
                      </p>
                      <Badge 
                        variant={player.status === 'OWES' ? 'danger' : player.status === 'OWED' ? 'success' : 'default'}
                      >
                        {player.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Player Settlement Modal */}
      {selectedPlayer && (
        <Modal 
          isOpen={showPlayerSettlement}
          onClose={() => {
            setShowPlayerSettlement(false);
            setSelectedPlayer(null);
          }}
          title={`Settlement: ${selectedPlayer.displayName}`}
        >
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-gray-800">
                <p className="text-xs text-gray-400">Total Buy-In</p>
                <p className="text-lg font-bold text-white">{formatCurrency(selectedPlayer.totalInvested)}</p>
              </Card>
              <Card className="p-3 bg-gray-800">
                <p className="text-xs text-gray-400">Total Cash-Out</p>
                <p className="text-lg font-bold text-white">{formatCurrency(selectedPlayer.totalCashOut)}</p>
              </Card>
            </div>

            <Card className={`p-3 ${selectedPlayer.status === 'OWES' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              <p className="text-xs text-gray-400">Balance</p>
              <p className={`text-2xl font-bold ${selectedPlayer.status === 'OWES' ? 'text-red-400' : 'text-green-400'}`}>
                {selectedPlayer.status === 'OWES' ? 'Owes: ' : 'Owed: '}{formatCurrency(Math.abs(selectedPlayer.balanceDue))}
              </p>
            </Card>

            <p className="text-xs text-gray-400">Active in {selectedPlayer.gamesActive} game(s)</p>

            <Button 
              onClick={() => navigate(`/games/${selectedPlayer.gameId}`)}
              className="w-full"
            >
              View Games
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Regular player dashboard
function DashboardPlayer() {
  return <div className="min-h-screen bg-gray-950 p-4">Regular Player Dashboard</div>;
}
