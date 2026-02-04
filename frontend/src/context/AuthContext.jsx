import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import wsService from '../services/websocket';
import { biometricService } from '../services/biometric';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPin, setNeedsPin] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('biometricEnabled') === 'true';
  });
  const [trustedDevices, setTrustedDevices] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('trustedDevices')) || []; }
    catch { return []; }
  });

  const persistDevices = (updater) => {
    setTrustedDevices(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('trustedDevices', JSON.stringify(next));
      return next;
    });
  };

  const rememberCurrentDevice = () => {
    if (typeof window === 'undefined') return;
    const fingerprint = navigator.userAgent || 'web';
    const deviceId = localStorage.getItem('deviceId') || (crypto?.randomUUID?.() || String(Date.now()));
    const label = navigator.platform || 'This device';
    persistDevices(prev => {
      const existing = prev.find(d => d.id === deviceId || d.fingerprint === fingerprint);
      const device = {
        id: existing?.id || deviceId,
        fingerprint,
        label: existing?.label || label,
        addedAt: existing?.addedAt || Date.now(),
        lastUsed: Date.now(),
      };
      const filtered = prev.filter(d => d.id !== device.id && d.fingerprint !== fingerprint);
      const next = [device, ...filtered].slice(0, 5);
      localStorage.setItem('deviceId', device.id);
      return next;
    });
  };

  const revokeTrustedDevice = (id) => {
    if (typeof window === 'undefined') return;
    persistDevices(prev => prev.filter(d => d.id !== id));
    if (localStorage.getItem('deviceId') === id) localStorage.removeItem('deviceId');
  };

  // Try auto-login on mount
  useEffect(() => {
    const tryAutoLogin = async () => {
      const token = localStorage.getItem('token');
      const rememberToken = localStorage.getItem('rememberToken');
      const savedUserId = localStorage.getItem('userId');
      const biometricOptIn = localStorage.getItem('biometricEnabled') === 'true';
      const availability = await biometricService.isAvailable();
      setBiometricSupported(availability.available);

      if (token) {
        try {
          const { user } = await authApi.getProfile();
          setUser(user);
          wsService.connect(token);
          if (user.hasPin && savedUserId) {
            // User has PIN - could prompt, but for smooth UX just let them in if token valid
          }
        } catch {
          // Token expired, try remember token
          if (rememberToken) {
            try {
              if (biometricOptIn && availability.available) {
                await biometricService.authenticate('Unlock LedgerAI');
              }
              const data = await authApi.autoLogin(rememberToken);
              localStorage.setItem('token', data.token);
              localStorage.setItem('rememberToken', data.rememberToken);
              localStorage.setItem('userId', data.user.id);
              setUser(data.user);
              wsService.connect(data.token);
              rememberCurrentDevice();
            } catch {
              clearAuth();
            }
          } else {
            clearAuth();
          }
        }
      } else if (rememberToken) {
        try {
          if (biometricOptIn && availability.available) {
            await biometricService.authenticate('Unlock LedgerAI');
          }
          const data = await authApi.autoLogin(rememberToken);
          localStorage.setItem('token', data.token);
          localStorage.setItem('rememberToken', data.rememberToken);
          localStorage.setItem('userId', data.user.id);
          setUser(data.user);
          wsService.connect(data.token);
          rememberCurrentDevice();
        } catch {
          clearAuth();
        }
      }
      setLoading(false);
    };
    tryAutoLogin();
  }, []);

  const clearAuth = () => {
    localStorage.removeItem('token');
    // Keep rememberToken for next auto-login attempt
    setUser(null);
  };

  const login = async (email, password, rememberMe = true) => {
    const data = await authApi.login({ email, password, rememberMe });
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    if (data.rememberToken) localStorage.setItem('rememberToken', data.rememberToken);
    setUser(data.user);
    wsService.connect(data.token);
    if (rememberMe) rememberCurrentDevice();
    return data.user;
  };

  const register = async (formData) => {
    const data = await authApi.register(formData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    if (data.rememberToken) localStorage.setItem('rememberToken', data.rememberToken);
    setUser(data.user);
    wsService.connect(data.token);
    rememberCurrentDevice();
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('rememberToken');
    localStorage.removeItem('userId');
    setUser(null);
    wsService.disconnect();
  };

  const verifyPin = async (pin) => {
    const userId = localStorage.getItem('userId');
    const data = await authApi.verifyPin(userId, pin);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    wsService.connect(data.token);
    setNeedsPin(false);
  };

  const enableBiometrics = async () => {
    const availability = await biometricService.isAvailable();
    if (!availability.available) throw new Error('Biometric authentication is not available on this device.');
    localStorage.setItem('biometricEnabled', 'true');
    setBiometricEnabled(true);
    setBiometricSupported(true);
  };

  const disableBiometrics = () => {
    localStorage.removeItem('biometricEnabled');
    setBiometricEnabled(false);
  };

  const isHost = user && ['SUPER_ADMIN', 'ADMIN', 'HOST'].includes(user.role);
  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      verifyPin,
      needsPin,
      isHost,
      isAdmin,
      isSuperAdmin,
      setUser,
      biometricSupported,
      biometricEnabled,
      enableBiometrics,
      disableBiometrics,
      trustedDevices,
      revokeTrustedDevice,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
