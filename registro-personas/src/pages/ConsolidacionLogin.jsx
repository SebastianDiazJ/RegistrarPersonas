import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ConsolidacionLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin, isAdminLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await loginAdmin(email, password);
    if (result.success) {
      navigate('/consolidacion');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="consol-login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-emoji">⚙️</span>
          <h1 className="login-title">Consolidación</h1>
          <p className="login-subtitle">Acceso exclusivo administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Correo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@iglesia.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn-login consol-btn-login" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar al Panel'}
          </button>
        </form>

        {isAdminLoggedIn() && (
          <button
            className="btn-entrar-directo consol-btn-directo"
            onClick={() => navigate('/consolidacion')}
          >
            Sesión activa — Entrar directo →
          </button>
        )}

        <button className="btn-back-lobby" onClick={() => navigate('/')}>
          ← Volver al Lobby
        </button>
      </div>
    </div>
  );
};

export default ConsolidacionLogin;
