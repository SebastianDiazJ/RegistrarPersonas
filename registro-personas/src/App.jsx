import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Lobby from './pages/Lobby';
import LoginPage from './pages/LoginPage';
import NetworkApp from './pages/NetworkApp';
import MigrationPage from './pages/MigrationPage';
import ConsolidacionLogin from './pages/ConsolidacionLogin';
import ConsolidacionPanel from './pages/ConsolidacionPanel';
import PastoralLogin from './pages/PastoralLogin';
import PastoralPanel from './pages/PastoralPanel';
import './App.css';

/* ── Theme Toggle ─────────────────────────────────────── */
const ThemeToggle = () => {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const theme = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [dark]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setDark(d => !d)}
      title={dark ? 'Cambiar a modo diurno' : 'Cambiar a modo nocturno'}
      aria-label="Cambiar tema"
    >
      <span className="theme-toggle-icon">{dark ? '☀' : '☾'}</span>
      <span className="theme-toggle-label">{dark ? 'Diurno' : 'Nocturno'}</span>
    </button>
  );
};

/* ── Theme initializer (runs before first paint) ──────── */
const ThemeInit = () => {
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);
  return null;
};

/* ── Protected routes ─────────────────────────────────── */
const ProtectedRoute = ({ red }) => {
  const { isLoggedIn, isAdminLoggedIn, isPastorLoggedIn, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  const allowed = isLoggedIn(red) || isAdminLoggedIn() || isPastorLoggedIn();
  if (!allowed) return <Navigate to={`/${red}/login`} replace />;
  return <NetworkApp red={red} />;
};

const AdminProtectedRoute = () => {
  const { isAdminLoggedIn, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  if (!isAdminLoggedIn()) return <Navigate to="/consolidacion/login" replace />;
  return <ConsolidacionPanel />;
};

const PastoralProtectedRoute = () => {
  const { isPastorLoggedIn, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  if (!isPastorLoggedIn()) return <Navigate to="/pastoral/login" replace />;
  return <PastoralPanel />;
};

function AppRoutes() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/setup" element={<MigrationPage />} />

        <Route path="/xtreme/login" element={<LoginPage red="xtreme" />} />
        <Route path="/xtreme" element={<ProtectedRoute red="xtreme" />} />

        <Route path="/parejas/login" element={<LoginPage red="parejas" />} />
        <Route path="/parejas" element={<ProtectedRoute red="parejas" />} />

        <Route path="/360/login" element={<LoginPage red="360" />} />
        <Route path="/360" element={<ProtectedRoute red="360" />} />

        <Route path="/senior/login" element={<LoginPage red="senior" />} />
        <Route path="/senior" element={<ProtectedRoute red="senior" />} />

        <Route path="/consolidacion/login" element={<ConsolidacionLogin />} />
        <Route path="/consolidacion" element={<AdminProtectedRoute />} />

        <Route path="/pastoral/login" element={<PastoralLogin />} />
        <Route path="/pastoral" element={<PastoralProtectedRoute />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
