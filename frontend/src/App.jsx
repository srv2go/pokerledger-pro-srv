import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingScreen } from './components/ui';
import { App as CapacitorApp } from '@capacitor/app';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateGame from './pages/CreateGame';
import GameDetail from './pages/GameDetail';
import Profile from './pages/Profile';
import Players from './pages/Players';
import Stats from './pages/Stats';

// Android back button handler
function useAndroidBackButton() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleBackButton = () => {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      CapacitorApp.exitApp();
    };

    CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate]);
}

// Protected Route wrapper
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Auth Route wrapper (redirect if already logged in)
function AuthRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  useAndroidBackButton(); // Handle Android back button

  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/games/new" element={<CreateGame />} />
        <Route path="/games/:id" element={<GameDetail />} />
        <Route path="/players" element={<Players />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stats" element={<Stats />} />
        {/* Placeholder routes */}
        <Route path="/history" element={<ComingSoon title="History" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Placeholder component for routes not yet implemented
function ComingSoon({ title }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-gray-400">Coming soon...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
