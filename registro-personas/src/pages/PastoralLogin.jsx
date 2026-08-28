import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PastoralLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginPastor, isPastorLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await loginPastor(email, password);
    if (result.success) {
      navigate('/pastoral');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="consol-login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Pastoral</h1>
          <p className="login-subtitle">Vista general — acceso exclusivo pastor</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Correo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="pastor@iglesia.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-group">
            <label>Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contrasena"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn-login consol-btn-login" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar al Panel'}
          </button>
        </form>

        {isPastorLoggedIn() && (
          <button
            className="btn-entrar-directo consol-btn-directo"
            onClick={() => navigate('/pastoral')}
          >
            Sesion activa — Entrar directo
          </button>
        )}

        <button className="btn-back-lobby" onClick={() => navigate('/')}>
          Volver al Lobby
        </button>
      </div>
    </div>
  );
};

export default PastoralLogin;
