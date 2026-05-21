import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingScreen } from './components/ui';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Dashboard';
import GamesPage from './pages/Games';
import CreateGame from './pages/CreateGame';
import GameDetail from './pages/GameDetail';
import Players from './pages/Players';
import PlayerDetail from './pages/PlayerDetail';
import LedgerPage from './pages/Ledger';
import Stats from './pages/Stats';
import History from './pages/History';
import Inbox from './pages/Inbox';
import Profile from './pages/Profile';
import AutomationsPage from './pages/Automations';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// Handle Android back button — prevent app close, navigate back instead
function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handlePopState = () => {};
    window.addEventListener('popstate', handlePopState);
    if (window.history.length <= 2) {
      window.history.pushState(null, '', window.location.href);
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const isNative = Capacitor?.isNativePlatform?.();
    if (!isNative || !NativeApp?.addListener) return;

    const authRoutes = ['/login', '/register'];
    const removeListener = NativeApp.addListener('backButton', () => {
      if (location.pathname === '/' || authRoutes.includes(location.pathname)) {
        if (NativeApp.minimizeApp) NativeApp.minimizeApp();
        else NativeApp.exitApp();
        return;
      }

      if (window.history.length > 1) {
        navigate(-1);
      } else if (NativeApp.minimizeApp) {
        NativeApp.minimizeApp();
      } else {
        NativeApp.exitApp();
      }
    });

    return () => {
      removeListener?.remove?.();
    };
  }, [location.pathname, navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BackButtonHandler />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/games" element={<ProtectedRoute><GamesPage /></ProtectedRoute>} />
          <Route path="/create-game" element={<ProtectedRoute><CreateGame /></ProtectedRoute>} />
          <Route path="/game/:id" element={<ProtectedRoute><GameDetail /></ProtectedRoute>} />
          <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
          <Route path="/player/:id" element={<ProtectedRoute><PlayerDetail /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><LedgerPage /></ProtectedRoute>} />
          <Route path="/automations" element={<ProtectedRoute><AutomationsPage /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
