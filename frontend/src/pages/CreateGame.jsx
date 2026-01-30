import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi, playersApi } from '../services/api';
import { Card, Button, Input, Select, Modal, Avatar } from '../components/ui';
import { 
  ArrowLeft, Calendar, MapPin, DollarSign, Users,
  Plus, X, Check, Search, ChevronDown
} from 'lucide-react';

const GAME_TYPES = [
  { value: 'TEXAS_HOLDEM', label: "Texas Hold'em" },
  { value: 'OMAHA', label: 'Omaha' },
  { value: 'OMAHA_HI_LO', label: 'Omaha Hi/Lo' },
  { value: 'MIXED', label: 'Mixed Games' },
];

const REBUY_POLICIES = [
  { value: 'UNLIMITED', label: 'Unlimited Rebuys' },
  { value: 'CAPPED', label: 'Capped Rebuys' },
  { value: 'TIME_LIMITED', label: 'Time Limited' },
  { value: 'NONE', label: 'No Rebuys' },
];

export default function CreateGame() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    gameType: 'TEXAS_HOLDEM',
    startTime: '',
    location: '',
    buyInAmount: '100',
    blindsSmall: '1',
    blindsBig: '2',
    rakePercentage: '0',
    rebuyPolicy: 'UNLIMITED',
    maxRebuys: '',
    notes: '',
  });

  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const gameData = {
        ...formData,
        buyInAmount: parseFloat(formData.buyInAmount),
        blindsSmall: parseFloat(formData.blindsSmall),
        blindsBig: parseFloat(formData.blindsBig),
        rakePercentage: parseFloat(formData.rakePercentage),
        maxRebuys: formData.maxRebuys ? parseInt(formData.maxRebuys) : null,
        startTime: new Date(formData.startTime).toISOString(),
        playerIds: selectedPlayers.map(p => p.id),
      };

      const { game } = await gamesApi.create(gameData);
      navigate(`/games/${game.id}`);
    } catch (err) {
      console.error('Game creation error:', err);
      setError(err.message || err.error || 'Failed to create game');
      setLoading(false);
    }
  };

  const removePlayer = (playerId) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-white">New Game</h1>
            <p className="text-xs text-gray-400">Step {step} of 3</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-800">
          <div 
            className="h-full bg-felt-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </header>

      <main className="px-4 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Game Details</h2>
              <p className="text-gray-400 text-sm">Set up the basics for your game</p>
            </div>

            <Input
              name="name"
              label="Game Name"
              placeholder="Friday Night Poker"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Select
              name="gameType"
              label="Game Type"
              value={formData.gameType}
              onChange={handleChange}
              options={GAME_TYPES}
            />

            <Input
              name="startTime"
              type="datetime-local"
              label="Start Time"
              value={formData.startTime}
              onChange={handleChange}
              required
            />

            <Input
              name="location"
              label="Location"
              placeholder="123 Main St or 'Mike's Place'"
              value={formData.location}
              onChange={handleChange}
            />

            <div className="pt-4">
              <Button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.startTime}
                className="w-full"
                size="lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Stakes & Structure */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Stakes & Structure</h2>
              <p className="text-gray-400 text-sm">Configure buy-ins and blinds</p>
            </div>

            <Input
              name="buyInAmount"
              type="number"
              label="Default Buy-in Amount"
              placeholder="100"
              value={formData.buyInAmount}
              onChange={handleChange}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="blindsSmall"
                type="number"
                label="Small Blind"
                placeholder="1"
                value={formData.blindsSmall}
                onChange={handleChange}
              />
              <Input
                name="blindsBig"
                type="number"
                label="Big Blind"
                placeholder="2"
                value={formData.blindsBig}
                onChange={handleChange}
              />
            </div>

            <Select
              name="rebuyPolicy"
              label="Rebuy Policy"
              value={formData.rebuyPolicy}
              onChange={handleChange}
              options={REBUY_POLICIES}
            />

            {formData.rebuyPolicy === 'CAPPED' && (
              <Input
                name="maxRebuys"
                type="number"
                label="Maximum Rebuys"
                placeholder="3"
                value={formData.maxRebuys}
                onChange={handleChange}
              />
            )}

            <Input
              name="rakePercentage"
              type="number"
              label="House Rake (%)"
              placeholder="0"
              value={formData.rakePercentage}
              onChange={handleChange}
            />

            <div className="flex gap-3 pt-4">
              <Button 
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)}
                className="flex-1"
                size="lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Players */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Invite Players</h2>
              <p className="text-gray-400 text-sm">Add players to your game</p>
            </div>

            <Button 
              variant="secondary" 
              onClick={() => setShowPlayerModal(true)}
              className="w-full"
            >
              <Plus className="w-5 h-5" />
              Add Players
            </Button>

            {selectedPlayers.length > 0 && (
              <Card className="divide-y divide-gray-800">
                {selectedPlayers.map(player => (
                  <div key={player.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={player.displayName} size="sm" />
                      <div>
                        <p className="font-medium text-white">{player.displayName}</p>
                        <p className="text-xs text-gray-400">{player.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removePlayer(player.id)}
                      className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </Card>
            )}

            <Input
              name="notes"
              label="Game Notes (Optional)"
              placeholder="Any special rules or notes..."
              value={formData.notes}
              onChange={handleChange}
            />

            <div className="flex gap-3 pt-4">
              <Button 
                variant="secondary"
                onClick={() => setStep(2)}
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                loading={loading}
                className="flex-1"
                size="lg"
              >
                Create Game
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Player Selection Modal */}
      <PlayerSelectModal
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        selectedPlayers={selectedPlayers}
        onSelect={setSelectedPlayers}
      />
    </div>
  );
}

// Player Selection Modal
function PlayerSelectModal({ isOpen, onClose, selectedPlayers, onSelect }) {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { players } = await playersApi.list(search);
      setPlayers(players);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (player) => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    if (isSelected) {
      onSelect(prev => prev.filter(p => p.id !== player.id));
    } else {
      onSelect(prev => [...prev, player]);
    }
  };

  // Load players when modal opens
  useEffect(() => {
    if (isOpen) loadPlayers();
  }, [isOpen, search]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Players" size="lg">
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPlayers()}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {players.map(player => {
          const isSelected = selectedPlayers.some(p => p.id === player.id);
          return (
            <div 
              key={player.id}
              onClick={() => togglePlayer(player)}
              className={`p-4 flex items-center gap-3 cursor-pointer border-b border-gray-800 transition-colors ${
                isSelected ? 'bg-felt-500/10' : 'hover:bg-gray-800/50'
              }`}
            >
              <Avatar name={player.displayName} />
              <div className="flex-1">
                <p className="font-medium text-white">{player.displayName}</p>
                <p className="text-sm text-gray-400">{player.email}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected 
                  ? 'border-felt-500 bg-felt-500' 
                  : 'border-gray-600'
              }`}>
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>
            </div>
          );
        })}

        {players.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No players found</p>
            <p className="text-sm mt-1">Add players from the Players tab first</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <Button onClick={onClose} className="w-full">
          Done ({selectedPlayers.length} selected)
        </Button>
      </div>
    </Modal>
  );
}
