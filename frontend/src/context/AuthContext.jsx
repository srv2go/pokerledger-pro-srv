import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import wsService from '../services/websocket';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsPin, setNeedsPin] = useState(false);

  // Try auto-login on mount
  useEffect(() => {
    const tryAutoLogin = async () => {
      const token = localStorage.getItem('token');
      const rememberToken = localStorage.getItem('rememberToken');
      const savedUserId = localStorage.getItem('userId');

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
              const data = await authApi.autoLogin(rememberToken);
              localStorage.setItem('token', data.token);
              localStorage.setItem('rememberToken', data.rememberToken);
              localStorage.setItem('userId', data.user.id);
              setUser(data.user);
              wsService.connect(data.token);
            } catch {
              clearAuth();
            }
          } else {
            clearAuth();
          }
        }
      } else if (rememberToken) {
        try {
          const data = await authApi.autoLogin(rememberToken);
          localStorage.setItem('token', data.token);
          localStorage.setItem('rememberToken', data.rememberToken);
          localStorage.setItem('userId', data.user.id);
          setUser(data.user);
          wsService.connect(data.token);
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
    return data.user;
  };

  const register = async (formData) => {
    const data = await authApi.register(formData);
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    if (data.rememberToken) localStorage.setItem('rememberToken', data.rememberToken);
    setUser(data.user);
    wsService.connect(data.token);
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

  const isHost = user && ['SUPER_ADMIN', 'ADMIN', 'HOST'].includes(user.role);
  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, verifyPin, needsPin, isHost, isAdmin, isSuperAdmin, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
