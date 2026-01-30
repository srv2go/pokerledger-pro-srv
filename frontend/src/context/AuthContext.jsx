import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import wsService from '../services/websocket';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const { user } = await authApi.getProfile();
      setUser(user);
      
      // Connect WebSocket
      await wsService.connect();
    } catch (err) {
      console.error('Failed to load user:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { user, token } = await authApi.login({ email, password });
      localStorage.setItem('token', token);
      setUser(user);
      
      // Connect WebSocket
      await wsService.connect();
      
      return user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const { user, token } = await authApi.register(userData);
      localStorage.setItem('token', token);
      setUser(user);
      
      // Connect WebSocket
      await wsService.connect();
      
      return user;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    wsService.disconnect();
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const { user: updatedUser } = await authApi.updateProfile(data);
      setUser(prev => ({ ...prev, ...updatedUser }));
      return updatedUser;
    } catch (err) {
      throw err;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isHost: user?.role === 'HOST',
    login,
    register,
    logout,
    updateProfile,
    refreshUser: loadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
