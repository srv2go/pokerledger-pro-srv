import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { User, Crown } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('PLAYER');
  const [form, setForm] = useState({ displayName: '', email: '', password: '', phone: '', pin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ ...form, role });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 safe-top">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-felt-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🃏</span></div>
          <h1 className="text-2xl font-bold text-white">Join PokerLedger</h1>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-center text-gray-400 mb-4">I want to...</p>
            <button onClick={() => { setRole('HOST'); setStep(2); }}
              className="w-full p-4 card flex items-center gap-4 hover:border-felt-500 transition">
              <div className="w-12 h-12 bg-felt-600/20 rounded-xl flex items-center justify-center"><Crown className="w-6 h-6 text-felt-400" /></div>
              <div className="text-left"><p className="font-bold text-white">Host Games</p><p className="text-sm text-gray-400">Create tables, manage players, track finances</p></div>
            </button>
            <button onClick={() => { setRole('PLAYER'); setStep(2); }}
              className="w-full p-4 card flex items-center gap-4 hover:border-blue-500 transition">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center"><User className="w-6 h-6 text-blue-400" /></div>
              <div className="text-left"><p className="font-bold text-white">Play Games</p><p className="text-sm text-gray-400">View game history & personal stats</p></div>
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <Link to="/login" className="text-felt-400">Sign in</Link></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <button type="button" onClick={() => setStep(1)} className="text-sm text-felt-400 mb-2">← Change role</button>
            <div className="p-3 bg-gray-800 rounded-xl text-center">
              <Badge role={role} />
            </div>
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>}
            <Input label="Display Name" value={form.displayName} onChange={set('displayName')} placeholder="Your name" required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min 6 characters" required minLength={6} />
            <Input label="Phone (for WhatsApp)" value={form.phone} onChange={set('phone')} placeholder="+1 555 123 4567" />
            <Input label="PIN (optional quick unlock)" value={form.pin} onChange={set('pin')} placeholder="4-6 digit PIN" maxLength={6} />
            <Button type="submit" loading={loading} className="w-full">Create Account</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Badge({ role }) {
  const r = { HOST: { label: 'Host', color: 'text-felt-400', bg: 'bg-felt-500/20' }, PLAYER: { label: 'Player', color: 'text-blue-400', bg: 'bg-blue-500/20' } }[role];
  return <span className={`${r.bg} ${r.color} px-3 py-1 rounded-full text-sm font-semibold`}>Registering as {r.label}</span>;
}
