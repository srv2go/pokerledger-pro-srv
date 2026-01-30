import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { playersApi } from '../services/api';
import { Card, Button, Input, Avatar, LoadingScreen, EmptyState, Modal } from '../components/ui';
import { ArrowLeft, Plus, Search, Users, Phone, Mail, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function Players() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await playersApi.list();
      setPlayers(data.players || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.phone?.includes(searchQuery)
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <LoadingScreen message="Loading players..." />;
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="font-bold text-white">Players</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-lg hover:bg-gray-800 text-felt-400"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-felt-500"
          />
        </div>

        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {/* Players List */}
        {filteredPlayers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Players Found"
            description={searchQuery ? "No players match your search" : "Add players to get started"}
            action={!searchQuery && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                Add Player
              </Button>
            )}
          />
        ) : (
          <div className="space-y-3">
            {filteredPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </div>

      {/* Add Player Modal */}
      {showAddModal && (
        <AddPlayerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadPlayers();
          }}
        />
      )}
    </div>
  );
}

function PlayerCard({ player }) {
  const totalProfit = player.history?.reduce((sum, game) => sum + (game.profitLoss || 0), 0) || 0;
  const gamesPlayed = player.history?.length || 0;

  return (
    <Card className="hover:border-felt-500/30 transition-colors cursor-pointer">
      <div className="flex items-center gap-4">
        <Avatar name={player.displayName} size="lg" />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{player.displayName}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {player.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {player.phone}
              </span>
            )}
            {player.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3" />
                {player.email}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className={`font-semibold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalProfit >= 0 ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(Math.abs(totalProfit))}
          </div>
          <p className="text-xs text-gray-500">{gamesPlayed} games</p>
        </div>
      </div>
    </Card>
  );
}

function AddPlayerModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await playersApi.create(formData);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to add player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Add New Player">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <Input
          label="Display Name"
          name="displayName"
          value={formData.displayName}
          onChange={handleChange}
          icon={Users}
          required
          placeholder="John Doe"
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          icon={Mail}
          placeholder="john@example.com"
        />

        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          icon={Phone}
          placeholder="+1 (555) 000-0000"
        />

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            Add Player
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
