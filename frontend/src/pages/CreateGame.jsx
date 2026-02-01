import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { Button, Input, Select, Card } from '../components/ui';
import { ArrowLeft } from 'lucide-react';
import { useToast, fmtPts } from '../hooks';
import { Toast } from '../components/ui';

const GAME_TYPES = [{ value: 'TEXAS_HOLDEM', label: 'Texas Hold\'em' }, { value: 'OMAHA', label: 'Omaha' }, { value: 'OMAHA_HI_LO', label: 'Omaha Hi-Lo' }, { value: 'MIXED', label: 'Mixed' }];

export default function CreateGame() {
  const nav = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', gameType: 'TEXAS_HOLDEM', buyInAmount: '100',
    blindsSmall: '1', blindsBig: '2', rakePercentage: '0',
    location: '', rebuyPolicy: 'UNLIMITED', notes: '',
  });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const game = await gamesApi.create({
        ...form,
        buyInAmount: parseFloat(form.buyInAmount),
        blindsSmall: parseFloat(form.blindsSmall) || null,
        blindsBig: parseFloat(form.blindsBig) || null,
        rakePercentage: parseFloat(form.rakePercentage) || 0,
      });
      nav(`/game/${game.game.id}`);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-8">
      <header className="sticky-header px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-gray-800"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
          <h1 className="font-bold text-white">Create Game</h1>
        </div>
      </header>

      <form onSubmit={submit} className="px-4 py-4 space-y-4 page-enter">
        <Input label="Game Name" value={form.name} onChange={set('name')} placeholder="Friday Night Poker" required />
        <Select label="Game Type" value={form.gameType} onChange={set('gameType')} options={GAME_TYPES} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Buy-in (points)" type="number" value={form.buyInAmount} onChange={set('buyInAmount')} required min="0" />
          <Input label="Rake %" type="number" value={form.rakePercentage} onChange={set('rakePercentage')} min="0" max="100" step="0.1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Small Blind" type="number" value={form.blindsSmall} onChange={set('blindsSmall')} min="0" />
          <Input label="Big Blind" type="number" value={form.blindsBig} onChange={set('blindsBig')} min="0" />
        </div>
        <Input label="Location" value={form.location} onChange={set('location')} placeholder="Optional" />
        <Input label="Notes" value={form.notes} onChange={set('notes')} placeholder="Optional" />
        <Button type="submit" loading={loading} className="w-full">Create Game</Button>
      </form>
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}
