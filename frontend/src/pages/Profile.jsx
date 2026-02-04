import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, notificationsApi } from '../services/api';
import { Card, Button, Input, Modal, Toast } from '../components/ui';
import { BottomNav } from './Dashboard';
import { useToast } from '../hooks';
import { User, Shield, Bell, Key, LogOut, MessageCircle, Crown, ChevronRight, PhoneCall } from 'lucide-react';

export default function ProfilePage() {
  const nav = useNavigate();
  const {
    user,
    isHost,
    isAdmin,
    isSuperAdmin,
    logout,
    setUser,
    biometricEnabled,
    biometricSupported,
    enableBiometrics,
    disableBiometrics,
    trustedDevices,
    revokeTrustedDevice,
  } = useAuth();
  const toast = useToast();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [waEnabled, setWaEnabled] = useState(user?.whatsappEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPrefs = async () => {
      try {
        const prefs = await notificationsApi.getPreferences();
        if (!mounted) return;
        if (typeof prefs.whatsappEnabled === 'boolean') setWaEnabled(prefs.whatsappEnabled);
        if (typeof prefs.smsEnabled === 'boolean') setSmsEnabled(prefs.smsEnabled);
      } catch (e) {
        console.warn('Failed to load notification prefs', e);
      }
    };
    loadPrefs();
    return () => { mounted = false; };
  }, []);

  const toggleWhatsApp = async () => {
    const next = !waEnabled;
    try {
      await notificationsApi.toggleWhatsapp(next);
      setWaEnabled(next);
      toast.success(next ? 'WhatsApp enabled' : 'WhatsApp disabled');
    } catch (e) { toast.error(e.message); }
  };

  const toggleSms = async () => {
    const next = !smsEnabled;
    try {
      await notificationsApi.toggleSms(next);
      setSmsEnabled(next);
      toast.success(next ? 'SMS backup enabled' : 'SMS backup disabled');
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

  const toggleBiometric = async () => {
    try {
      if (biometricEnabled) {
        disableBiometrics();
        toast.info('Biometric unlock disabled');
      } else {
        await enableBiometrics();
        toast.success('Biometric unlock enabled');
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  const roleIcon = { SUPER_ADMIN: '👑', ADMIN: '🛡️', HOST: '⌁', PLAYER: '👤' }[user?.role] || '👤';
  const roleColor = { SUPER_ADMIN: 'text-gold-600', ADMIN: 'text-brand-600', HOST: 'text-brand-600', PLAYER: 'text-brand-600' }[user?.role];

  return (
    <div className="min-h-screen bg-[var(--color-gray-50)] pb-28">
      <header className="sticky-header px-4 py-3">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Profile</h1>
      </header>

      <main className="px-4 py-4 space-y-4 page-enter">
        {/* User card */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center text-2xl">{roleIcon}</div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)] text-lg">{user?.displayName}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{user?.email}</p>
              <p className={`text-sm font-semibold ${roleColor} capitalize mt-0.5`}>{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-gold-500" />
              <div>
                <p className="text-[var(--color-text-primary)] font-medium">Subscription</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{user?.subscription === 'PREMIUM' ? 'Premium' : 'Free Plan'}</p>
              </div>
            </div>
            {user?.subscription !== 'PREMIUM' && (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Last 3 games</span>
            )}
          </div>
        </Card>

        {/* Settings */}
        <Card className="divide-y divide-[var(--color-gray-200)]">
          {/* WhatsApp Toggle */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-brand-600" />
              <div>
                <p className="text-[var(--color-text-primary)] font-medium">WhatsApp Notifications</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Receive game notifications via WhatsApp</p>
              </div>
            </div>
            <button onClick={toggleWhatsApp}
              className={`w-12 h-7 rounded-full transition-colors ${waEnabled ? 'bg-brand-500' : 'bg-[var(--color-gray-300)]'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${waEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* SMS Toggle */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-brand-600" />
              <div>
                <p className="text-[var(--color-text-primary)] font-medium">SMS Backup (Twilio)</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Fallback texts when WhatsApp is unavailable</p>
              </div>
            </div>
            <button onClick={toggleSms}
              className={`w-12 h-7 rounded-full transition-colors ${smsEnabled ? 'bg-brand-500' : 'bg-[var(--color-gray-300)]'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${smsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Biometric */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-brand-500" />
              <div>
                <p className="text-[var(--color-text-primary)] font-medium">Biometric Unlock</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{biometricSupported ? 'Use Face/Touch ID for quick access' : 'Not supported on this device'}</p>
              </div>
            </div>
            <button onClick={toggleBiometric}
              disabled={!biometricSupported}
              className={`w-12 h-7 rounded-full transition-colors ${biometricEnabled ? 'bg-brand-500' : 'bg-[var(--color-gray-300)]'} ${!biometricSupported ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${biometricEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* PIN */}
          <button onClick={() => setShowPin(true)} className="p-4 flex items-center justify-between w-full text-left">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-[var(--color-text-primary)] font-medium">Security PIN</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{user?.hasPin ? 'Change PIN' : 'Set up quick unlock PIN'}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Phone */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-[var(--color-text-primary)] font-medium">Phone</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{user?.phone || 'Not set'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Admin section */}
        {isAdmin && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <p className="text-[var(--color-text-primary)] font-medium">Admin</p>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isSuperAdmin ? 'Super Admin — full system access, can promote admins (max 3 super admins)' : 'Admin — manage hosts, view all game data'}
            </p>
          </Card>
        )}

        {/* Trusted devices */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-brand-500" />
            <p className="text-[var(--color-text-primary)] font-medium">Trusted Devices</p>
          </div>
          {trustedDevices.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">No devices remembered yet.</p>
          ) : (
            <ul className="space-y-2">
              {trustedDevices.map(device => (
                <li key={device.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">{device.label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Last used {new Date(device.lastUsed || device.addedAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => revokeTrustedDevice(device.id)} className="text-xs text-brand-600">Revoke</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

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

      <BottomNav current="/settings" navigate={nav} />
      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  );
}
