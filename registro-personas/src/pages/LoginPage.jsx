import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const REDES_CONFIG = {
  xtreme:  { nombre: 'XTREME',  emoji: '🔥', color1: '#667eea', color2: '#764ba2' },
  parejas: { nombre: 'PAREJAS', emoji: '💑', color1: '#f093fb', color2: '#f5576c' },
  '360':   { nombre: '360',     emoji: '🌐', color1: '#4facfe', color2: '#00f2fe' }
};

const LoginPage = ({ red }) => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const config = REDES_CONFIG[red];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(red, usuario, password);
    if (result.success) {
      navigate(`/${red}`);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleEntrarDirecto = () => navigate(`/${red}`);

  return (
    <div className="login-page" style={{ '--c1': config.color1, '--c2': config.color2 }}>
      <div className="login-card">
        <div className="login-header">
          <span className="login-emoji">{config.emoji}</span>
          <h1 className="login-title">Red {config.nombre}</h1>
          <p className="login-subtitle">Ingresa tus credenciales</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Usuario</label>
            <input
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              placeholder="Nombre de usuario"
              autoComplete="username"
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

          <button className="btn-login" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        {isLoggedIn(red) && (
          <button className="btn-entrar-directo" onClick={handleEntrarDirecto}>
            Ya tienes sesión activa — Entrar directo →
          </button>
        )}

        <button className="btn-back-lobby" onClick={() => navigate('/')}>
          ← Volver al Lobby
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
