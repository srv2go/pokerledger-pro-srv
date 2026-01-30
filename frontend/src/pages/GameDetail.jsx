import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame, formatCurrency, useToast } from '../hooks';
import { gamesApi, transactionsApi, playersApi } from '../services/api';
import { 
  Card, Button, Badge, Avatar, Modal, Input, Select,
  StatCard, LoadingScreen, ToastContainer, EmptyState
} from '../components/ui';
import { 
  ArrowLeft, Play, Pause, Square, Users, DollarSign,
  Plus, Clock, TrendingUp, AlertCircle, MessageCircle,
  UserPlus, Search, Check, X
} from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'VENMO', label: 'Venmo' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
];

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { game, stats, loading, error, isHost, refresh } = useGame(id);
  const { toasts, success, error: showError, removeToast } = useToast();

  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return <LoadingScreen message="Loading game..." />;
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Game Not Found</h2>
          <p className="text-gray-400 mb-4">{error || 'This game does not exist'}</p>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const isActive = game.status === 'ACTIVE';
  const players = game.players || [];
  const activePlayers = players.filter(p => p.status === 'ACTIVE');

  // Game control actions
  const handleStartGame = async () => {
    try {
      setActionLoading(true);
      await gamesApi.start(id);
      success('Game started!');
      refresh();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseGame = async () => {
    try {
      setActionLoading(true);
      await gamesApi.pause(id);
      success('Game paused');
      refresh();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndGame = async () => {
    if (!confirm('Are you sure you want to end this game?')) return;
    try {
      setActionLoading(true);
      await gamesApi.end(id);
      success('Game ended');
      refresh();
    } catch (err) {
      showError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyIn = (player) => {
    setSelectedPlayer(player);
    setShowBuyInModal(true);
  };

  const handleCashOut = (player) => {
    setSelectedPlayer(player);
    setShowCashOutModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-white">{game.name}</h1>
            <p className="text-xs text-gray-400">
              ${game.blindsSmall}/{game.blindsBig} • {game.gameType?.replace('_', ' ')}
            </p>
          </div>
          <GameStatusBadge status={game.status} />
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            label="Players" 
            value={activePlayers.length}
            icon={Users}
          />
          <StatCard 
            label="Total Pot" 
            value={formatCurrency(stats?.totalPot || 0)}
            icon={DollarSign}
          />
          <StatCard 
            label="Avg Stack" 
            value={formatCurrency(stats?.averageStack || 0)}
            icon={TrendingUp}
          />
        </div>

        {/* Game Controls (Host only) */}
        {isHost && (
          <div className="flex gap-3">
            {game.status === 'SCHEDULED' && (
              <Button 
                onClick={handleStartGame} 
                loading={actionLoading}
                className="flex-1"
              >
                <Play className="w-5 h-5" /> Start Game
              </Button>
            )}
            {game.status === 'ACTIVE' && (
              <>
                <Button 
                  variant="secondary" 
                  onClick={handlePauseGame}
                  loading={actionLoading}
                  className="flex-1"
                >
                  <Pause className="w-5 h-5" /> Pause
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleEndGame}
                  loading={actionLoading}
                  className="flex-1"
                >
                  <Square className="w-5 h-5" /> End Game
                </Button>
              </>
            )}
            {game.status === 'PAUSED' && (
              <>
                <Button 
                  onClick={async () => {
                    await gamesApi.resume(id);
                    refresh();
                  }}
                  className="flex-1"
                >
                  <Play className="w-5 h-5" /> Resume
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleEndGame}
                  className="flex-1"
                >
                  <Square className="w-5 h-5" /> End
                </Button>
              </>
            )}
          </div>
        )}

        {/* Players List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Players</h2>
            {isHost && (
              <Button size="sm" variant="ghost" onClick={() => setShowAddPlayerModal(true)}>
                <UserPlus className="w-4 h-4" /> Add Player
              </Button>
            )}
          </div>

          {players.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={Users}
                title="No players yet"
                description={isHost ? "Add players to start recording buy-ins" : "Waiting for host to add players"}
                action={isHost && (
                  <Button size="sm" onClick={() => setShowAddPlayerModal(true)}>
                    <UserPlus className="w-4 h-4" /> Add Player
                  </Button>
                )}
              />
            </Card>
          ) : (
            <Card className="divide-y divide-gray-800">
              {players.map(gp => (
                <PlayerRow
                  key={gp.id}
                  gamePlayer={gp}
                  isHost={isHost}
                  gameStatus={game.status}
                  onBuyIn={() => handleBuyIn(gp)}
                  onCashOut={() => handleCashOut(gp)}
                />
              ))}
            </Card>
          )}
        </section>

        {/* Game Info */}
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Game Info</h2>
          <Card className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Buy-in</span>
              <span className="text-white">{formatCurrency(game.buyInAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Blinds</span>
              <span className="text-white">${game.blindsSmall}/${game.blindsBig}</span>
            </div>
            {game.location && (
              <div className="flex justify-between">
                <span className="text-gray-400">Location</span>
                <span className="text-white">{game.location}</span>
              </div>
            )}
            {game.rakePercentage > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Rake</span>
                <span className="text-white">{game.rakePercentage}%</span>
              </div>
            )}
          </Card>
        </section>

        {/* WhatsApp Info */}
        <Card className="p-4 bg-felt-900/20 border-felt-800">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-felt-400 mt-0.5" />
            <div>
              <p className="font-medium text-felt-400">WhatsApp Notifications</p>
              <p className="text-sm text-gray-400 mt-1">
                Players receive automatic notifications when you record buy-ins, top-ups, and cash-outs.
              </p>
            </div>
          </div>
        </Card>
      </main>

      {/* Buy-In / Top-Up Modal */}
      <BuyInModal
        isOpen={showBuyInModal}
        onClose={() => {
          setShowBuyInModal(false);
          setSelectedPlayer(null);
        }}
        gameId={id}
        player={selectedPlayer}
        defaultAmount={game.buyInAmount}
        onSuccess={(message) => {
          refresh();
          success(message);
        }}
        onError={showError}
      />

      {/* Cash Out Modal */}
      <CashOutModal
        isOpen={showCashOutModal}
        onClose={() => {
          setShowCashOutModal(false);
          setSelectedPlayer(null);
        }}
        gameId={id}
        player={selectedPlayer}
        onSuccess={(message) => {
          refresh();
          success(message);
        }}
        onError={showError}
      />

      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        gameId={id}
        existingPlayerIds={players.map(p => p.playerId)}
        defaultBuyIn={game.buyInAmount}
        onSuccess={(message) => {
          refresh();
          success(message);
        }}
        onError={showError}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// Status Badge Component
function GameStatusBadge({ status }) {
  const variants = {
    SCHEDULED: { label: 'Scheduled', variant: 'info' },
    ACTIVE: { label: 'Live', variant: 'success' },
    PAUSED: { label: 'Paused', variant: 'warning' },
    COMPLETED: { label: 'Completed', variant: 'info' },
    CANCELLED: { label: 'Cancelled', variant: 'danger' },
  };

  const { label, variant } = variants[status] || { label: status, variant: 'info' };
  
  return <Badge variant={variant}>{label}</Badge>;
}

// Player Row Component - Host-focused actions
function PlayerRow({ gamePlayer, isHost, gameStatus, onBuyIn, onCashOut }) {
  const player = gamePlayer.player;
  const totalInvested = parseFloat(gamePlayer.totalInvested || 0);
  const cashOut = parseFloat(gamePlayer.cashOut || 0);
  const hasCashedOut = gamePlayer.status === 'CASHED_OUT';
  const profit = hasCashedOut ? cashOut - totalInvested : 0;
  const isGameActive = gameStatus === 'ACTIVE' || gameStatus === 'PAUSED';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={player.displayName} />
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
              gamePlayer.status === 'ACTIVE' ? 'bg-felt-500' : 
              gamePlayer.status === 'SITTING_OUT' ? 'bg-amber-500' : 'bg-gray-500'
            }`} />
          </div>
          <div>
            <p className="font-medium text-white">{player.displayName}</p>
            <p className="text-xs text-gray-400">
              {player.phone ? '📱 WhatsApp enabled' : 'No phone'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-white chip-amount">{formatCurrency(totalInvested)}</p>
          {hasCashedOut && (
            <p className={`text-xs chip-amount ${profit >= 0 ? 'chip-positive' : 'chip-negative'}`}>
              {formatCurrency(profit, true)}
            </p>
          )}
          {!hasCashedOut && (
            <p className="text-xs text-gray-400 capitalize">
              {gamePlayer.status?.toLowerCase().replace('_', ' ')}
            </p>
          )}
        </div>
      </div>

      {/* Host Actions */}
      {isHost && isGameActive && !hasCashedOut && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={onBuyIn} className="flex-1">
            <Plus className="w-4 h-4" /> Add Chips
          </Button>
          <Button size="sm" variant="secondary" onClick={onCashOut} className="flex-1">
            <Clock className="w-4 h-4" /> Cash Out
          </Button>
        </div>
      )}
    </div>
  );
}

// Buy-In Modal (for initial buy-in or adding more chips)
function BuyInModal({ isOpen, onClose, gameId, player, defaultAmount, onSuccess, onError }) {
  const [amount, setAmount] = useState(defaultAmount?.toString() || '100');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [sendNotification, setSendNotification] = useState(true);
  const [loading, setLoading] = useState(false);

  const isRebuy = player?.totalInvested > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRebuy ? transactionsApi.topUp : transactionsApi.buyIn;
      await endpoint({
        gameId,
        playerId: player?.player?.id || player?.playerId,
        amount: parseFloat(amount),
        paymentMethod,
        sendNotification,
      });
      onSuccess(`${isRebuy ? 'Top-up' : 'Buy-in'} recorded${sendNotification ? ' - WhatsApp sent' : ''}`);
      onClose();
      setAmount(defaultAmount?.toString() || '100');
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRebuy ? 'Add Chips (Top-up)' : 'Record Buy-in'}>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {player && (
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <Avatar name={player.player?.displayName || player.displayName} />
            <div>
              <span className="font-medium text-white">
                {player.player?.displayName || player.displayName}
              </span>
              {isRebuy && (
                <p className="text-xs text-gray-400">
                  Current: {formatCurrency(player.totalInvested || 0)}
                </p>
              )}
            </div>
          </div>
        )}

        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Select
          label="Payment Method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          options={PAYMENT_METHODS}
        />

        <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={sendNotification}
            onChange={(e) => setSendNotification(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-felt-500 focus:ring-felt-500"
          />
          <div>
            <p className="text-white font-medium">Send WhatsApp notification</p>
            <p className="text-xs text-gray-400">Player will receive a confirmation message</p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {isRebuy ? 'Add Chips' : 'Record Buy-in'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Cash Out Modal
function CashOutModal({ isOpen, onClose, gameId, player, onSuccess, onError }) {
  const [amount, setAmount] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transactionsApi.cashOut({
        gameId,
        playerId: player?.player?.id || player?.playerId,
        amount: parseFloat(amount),
        sendNotification,
      });
      onSuccess(`Cash-out recorded${sendNotification ? ' - WhatsApp summary sent' : ''}`);
      onClose();
      setAmount('');
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalInvested = parseFloat(player?.totalInvested || 0);
  const cashOutAmount = parseFloat(amount || 0);
  const profit = cashOutAmount - totalInvested;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Cash-out">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {player && (
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar name={player.player?.displayName} />
              <span className="font-medium text-white">{player.player?.displayName}</span>
            </div>
            <span className="text-gray-400">
              Invested: {formatCurrency(totalInvested)}
            </span>
          </div>
        )}

        <Input
          label="Final Chip Count"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter final amount"
          required
        />

        {amount && (
          <div className={`p-3 rounded-lg ${profit >= 0 ? 'bg-felt-500/10' : 'bg-red-500/10'}`}>
            <p className="text-sm text-gray-400">Profit/Loss</p>
            <p className={`text-xl font-bold chip-amount ${profit >= 0 ? 'chip-positive' : 'chip-negative'}`}>
              {formatCurrency(profit, true)}
            </p>
          </div>
        )}

        <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={sendNotification}
            onChange={(e) => setSendNotification(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-felt-500 focus:ring-felt-500"
          />
          <div>
            <p className="text-white font-medium">Send WhatsApp summary</p>
            <p className="text-xs text-gray-400">Player receives their profit/loss summary</p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Confirm Cash-out
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Add Player Modal
function AddPlayerModal({ isOpen, onClose, gameId, existingPlayerIds, defaultBuyIn, onSuccess, onError }) {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState(defaultBuyIn?.toString() || '100');
  const [sendNotification, setSendNotification] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadPlayers = async () => {
    try {
      setSearchLoading(true);
      const { players: allPlayers } = await playersApi.list(search);
      // Filter out players already in the game
      setPlayers(allPlayers.filter(p => !existingPlayerIds.includes(p.id)));
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlayer) return;
    
    setLoading(true);
    try {
      await transactionsApi.buyIn({
        gameId,
        playerId: selectedPlayer.id,
        amount: parseFloat(amount),
        sendNotification,
      });
      onSuccess(`${selectedPlayer.displayName} added with ${formatCurrency(amount)} buy-in`);
      onClose();
      setSelectedPlayer(null);
      setAmount(defaultBuyIn?.toString() || '100');
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Player to Game" size="lg">
      {!selectedPlayer ? (
        <>
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadPlayers()}
                onFocus={() => players.length === 0 && loadPlayers()}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {players.map(player => (
              <div 
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-800/50 border-b border-gray-800"
              >
                <Avatar name={player.displayName} />
                <div className="flex-1">
                  <p className="font-medium text-white">{player.displayName}</p>
                  <p className="text-sm text-gray-400">
                    {player.phone ? '📱 ' + player.phone : player.email}
                  </p>
                </div>
              </div>
            ))}

            {players.length === 0 && !searchLoading && (
              <div className="p-8 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No players found</p>
                <p className="text-sm mt-1">Search or create new players</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <Avatar name={selectedPlayer.displayName} />
            <div className="flex-1">
              <p className="font-medium text-white">{selectedPlayer.displayName}</p>
              <p className="text-sm text-gray-400">{selectedPlayer.email}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedPlayer(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Input
            label="Buy-in Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 text-felt-500 focus:ring-felt-500"
            />
            <div>
              <p className="text-white font-medium">Send WhatsApp notification</p>
              <p className="text-xs text-gray-400">Player receives buy-in confirmation</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSelectedPlayer(null)} className="flex-1">
              Back
            </Button>
            <Button onClick={handleSubmit} loading={loading} className="flex-1">
              Add Player
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
