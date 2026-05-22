import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Lobby from './pages/Lobby';
import LoginPage from './pages/LoginPage';
import NetworkApp from './pages/NetworkApp';
import MigrationPage from './pages/MigrationPage';
import './App.css';

const ProtectedRoute = ({ red }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  if (!isLoggedIn(red)) return <Navigate to={`/${red}/login`} replace />;
  return <NetworkApp red={red} />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/setup" element={<MigrationPage />} />

      <Route path="/xtreme/login" element={<LoginPage red="xtreme" />} />
      <Route path="/xtreme" element={<ProtectedRoute red="xtreme" />} />

      <Route path="/parejas/login" element={<LoginPage red="parejas" />} />
      <Route path="/parejas" element={<ProtectedRoute red="parejas" />} />

      <Route path="/360/login" element={<LoginPage red="360" />} />
      <Route path="/360" element={<ProtectedRoute red="360" />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
