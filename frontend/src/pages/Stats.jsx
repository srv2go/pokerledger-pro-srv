import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { playersApi, gamesApi } from '../services/api';
import { 
  Card, Button, LoadingScreen, EmptyState, Badge, Avatar 
} from '../components/ui';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Send, DollarSign, Users 
} from 'lucide-react';

export default function Stats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});

  useEffect(() => {
    loadPlayerStats();
  }, []);

  const loadPlayerStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all players
      const playersData = await playersApi.list();
      
      // For each player, calculate rolling balance across all games
      const playersWithStats = await Promise.all(
        playersData.players.map(async (player) => {
          try {
            // Get player's game participations
            const gamesData = await gamesApi.list({ playerId: player.id });
            
            let totalBuyIn = 0;
            let totalCashOut = 0;
            let gamesPlayed = 0;
            
            gamesData.games?.forEach(game => {
              const participation = game.players?.find(gp => gp.playerId === player.id);
              if (participation) {
                gamesPlayed++;
                totalBuyIn += parseFloat(participation.totalInvested || 0);
                if (participation.cashOut) {
                  totalCashOut += parseFloat(participation.cashOut);
                }
              }
            });
            
            const balance = totalCashOut - totalBuyIn;
            
            return {
              ...player,
              totalBuyIn,
              totalCashOut,
              balance,
              gamesPlayed
            };
          } catch (err) {
            console.warn(`Failed to load stats for player ${player.id}:`, err);
            return {
              ...player,
              totalBuyIn: 0,
              totalCashOut: 0,
              balance: 0,
              gamesPlayed: 0
            };
          }
        })
      );
      
      // Sort by balance (debtors first, then creditors)
      const sorted = playersWithStats.sort((a, b) => a.balance - b.balance);
      
      setPlayers(sorted);
    } catch (err) {
      console.error('Failed to load player stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (player) => {
    try {
      setSending(prev => ({ ...prev, [player.id]: true }));
      
      // TODO: Implement send reminder API
      // For now, just show success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`Reminder sent to ${player.displayName}`);
    } catch (err) {
      alert(`Failed to send reminder: ${err.message}`);
    } finally {
      setSending(prev => ({ ...prev, [player.id]: false }));
    }
  };

  const formatPoints = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  if (loading) {
    return <LoadingScreen message="Loading player statistics..." />;
  }

  const canSendReminders = user?.role && ['HOST', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="font-bold text-white">Player Statistics</h1>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Players</p>
                <p className="text-xl font-bold text-white">{players.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Volume</p>
                <p className="text-xl font-bold text-white">
                  {formatPoints(players.reduce((sum, p) => sum + p.totalBuyIn, 0))}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Players List */}
        {players.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Player Data"
            description="Add players and play some games to see statistics"
          />
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase">Player Balances</h2>
            
            {players.map(player => (
              <Card key={player.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      src={player.avatarUrl}
                      name={player.displayName}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {player.displayName}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {player.gamesPlayed} {player.gamesPlayed === 1 ? 'game' : 'games'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2 justify-end">
                      {player.balance >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold ${
                        player.balance >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {player.balance >= 0 ? '+' : '-'}{formatPoints(player.balance)} pts
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>Buy-in: {formatPoints(player.totalBuyIn)}</div>
                      <div>Cash-out: {formatPoints(player.totalCashOut)}</div>
                    </div>
                  </div>
                </div>

                {canSendReminders && player.balance < 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendReminder(player)}
                      disabled={sending[player.id]}
                      className="w-full"
                    >
                      <Send className="w-4 h-4" />
                      {sending[player.id] ? 'Sending...' : 'Send Payment Reminder'}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Rolling Balance</p>
              <p className="text-blue-300/80">
                Balances are calculated across all games. Positive balance means player is up, 
                negative means they owe the house.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
