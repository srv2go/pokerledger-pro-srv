import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { playersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Avatar, Input, Modal, EmptyState, Toast } from '../components/ui';
import { BottomNav } from './Dashboard';
import { useToast, fmtPts } from '../hooks';
import { ArrowLeft, Search, UserPlus, Phone, Mail, Users } from 'lucide-react';

export default function PlayersPage() {
  const nav = useNavigate();
  const { isHost } = useAuth();
  const toast = useToast();
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (q) => {
    try { setLoading(true); const d = await playersApi.list(q || ''); setPlayers(d.players); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header with safe area — + button positioned below status bar */}
      <header className="sticky-header px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Players</h1>
          {isHost && (
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(true)}>
              <UserPlus className="w-4 h-4" /> Add
            </Button>
          )}
        </div>
        {/* Search bar below header, not overlapping status bar */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input pl-10 text-sm" placeholder="Search players..." value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          />
        </div>
      </header>

      <main className="px-4 py-4 page-enter">
        {players.length === 0 && !loading ? (
          <EmptyState icon={Users} title="No players" description={isHost ? "Add your first player" : "No players found"} />
        ) : (
          <div className="space-y-2">
            {players.map(p => (
              <Card key={p.id} className="p-4 cursor-pointer hover:border-gray-700 transition" onClick={() => nav(`/player/${p.id}`)}>
                <div className="flex items-center gap-3">
                  <Avatar name={p.displayName} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{p.displayName}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {p.phone && <span><Phone className="w-3 h-3 inline" /> {p.phone}</span>}
                      {p.email && !p.email.includes('@temp.') && <span><Mail className="w-3 h-3 inline" /> {p.email}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${p.role === 'HOST' ? 'bg-felt-500/20 text-felt-400' : p.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                    {p.role}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AddPlayerModal isOpen={showAdd} onClose={() => setShowAdd(false)} onDone={(m) => { load(); toast.success(m); }} onErr={toast.error} />
      <BottomNav current="/players" navigate={nav} isHost={isHost} />
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}

function AddPlayerModal({ isOpen, onClose, onDone, onErr }) {
  const [form, setForm] = useState({ displayName: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await playersApi.create(form); onDone(`${form.displayName} added`); onClose(); setForm({ displayName: '', email: '', phone: '' }); }
    catch (e) { onErr(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Player">
      <form onSubmit={submit} className="p-4 space-y-4">
        <Input label="Name" value={form.displayName} onChange={set('displayName')} required />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="+1 555 123 4567" />
        <div className="flex gap-3"><Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button><Button type="submit" loading={loading} className="flex-1">Add</Button></div>
      </form>
    </Modal>
  );
}
