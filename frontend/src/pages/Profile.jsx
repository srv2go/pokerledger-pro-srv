import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, notificationsApi } from '../services/api';
import { Card, Button, Input, Modal, Toast } from '../components/ui';
import { BottomNav } from './Dashboard';
import { useToast } from '../hooks';
import { User, Shield, Bell, Key, LogOut, MessageCircle, Crown, ChevronRight } from 'lucide-react';

export default function ProfilePage() {
  const nav = useNavigate();
  const { user, isHost, isAdmin, isSuperAdmin, logout, setUser } = useAuth();
  const toast = useToast();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [waEnabled, setWaEnabled] = useState(user?.whatsappEnabled ?? true);

  const toggleWhatsApp = async () => {
    const next = !waEnabled;
    try {
      await notificationsApi.toggleWhatsapp(next);
      setWaEnabled(next);
      toast.success(next ? 'WhatsApp enabled' : 'WhatsApp disabled');
    } catch (e) { toast.error(e.message); }
  };

  const savePin = async () => {
    try {
      await authApi.setPin(pin);
      toast.success('PIN set');
      setShowPin(false);
      setPin('');
    } catch (e) { toast.error(e.message); }
  };

  const handleLogout = () => { logout(); nav('/login', { replace: true }); };

  const roleIcon = { SUPER_ADMIN: '👑', ADMIN: '🛡️', HOST: '🃏', PLAYER: '👤' }[user?.role] || '👤';
  const roleColor = { SUPER_ADMIN: 'text-gold-400', ADMIN: 'text-purple-400', HOST: 'text-felt-400', PLAYER: 'text-blue-400' }[user?.role];

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      <header className="sticky-header px-4 py-3">
        <h1 className="text-lg font-bold text-white">Profile</h1>
      </header>

      <main className="px-4 py-4 space-y-4 page-enter">
        {/* User card */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-felt-600/20 rounded-full flex items-center justify-center text-2xl">{roleIcon}</div>
            <div>
              <p className="font-bold text-white text-lg">{user?.displayName}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <p className={`text-sm font-semibold ${roleColor} capitalize mt-0.5`}>{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-gold-400" />
              <div>
                <p className="text-white font-medium">Subscription</p>
                <p className="text-sm text-gray-400">{user?.subscription === 'PREMIUM' ? 'Premium' : 'Free Plan'}</p>
              </div>
            </div>
            {user?.subscription !== 'PREMIUM' && (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Last 3 games</span>
            )}
          </div>
        </Card>

        {/* Settings */}
        <Card className="divide-y divide-gray-800">
          {/* WhatsApp Toggle */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-felt-400" />
              <div>
                <p className="text-white font-medium">WhatsApp Notifications</p>
                <p className="text-xs text-gray-400">Receive game notifications via WhatsApp</p>
              </div>
            </div>
            <button onClick={toggleWhatsApp}
              className={`w-12 h-7 rounded-full transition-colors ${waEnabled ? 'bg-felt-600' : 'bg-gray-700'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${waEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* PIN */}
          <button onClick={() => setShowPin(true)} className="p-4 flex items-center justify-between w-full text-left">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-white font-medium">Security PIN</p>
                <p className="text-xs text-gray-400">{user?.hasPin ? 'Change PIN' : 'Set up quick unlock PIN'}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Phone */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Phone</p>
                <p className="text-sm text-gray-400">{user?.phone || 'Not set'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Admin section */}
        {isAdmin && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <p className="text-white font-medium">Admin</p>
            </div>
            <p className="text-sm text-gray-400">
              {isSuperAdmin ? 'Super Admin — full system access, can promote admins (max 3 super admins)' : 'Admin — manage hosts, view all game data'}
            </p>
          </Card>
        )}

        {/* Logout */}
        <Button variant="danger" onClick={handleLogout} className="w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </main>

      {/* PIN Modal */}
      <Modal isOpen={showPin} onClose={() => { setShowPin(false); setPin(''); }} title="Set PIN">
        <div className="p-4 space-y-4">
          <Input label="4-6 digit PIN" type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} placeholder="••••" />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowPin(false); setPin(''); }} className="flex-1">Cancel</Button>
            <Button onClick={savePin} disabled={pin.length < 4} className="flex-1">Save PIN</Button>
          </div>
        </div>
      </Modal>

      <BottomNav current="/profile" navigate={nav} isHost={isHost} />
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}
