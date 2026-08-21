import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const REDES_CONFIG = {
  xtreme:  { nombre: 'XTREME',  color: '#4338CA', desc: 'Red de jovenes y adultos' },
  parejas: { nombre: 'PAREJAS', color: '#BE185D', desc: 'Red de parejas' },
  '360':   { nombre: '360',     color: '#0369A1', desc: 'Red 360 grados' },
  senior:  { nombre: 'SENIOR',  color: '#B45309', desc: 'Red de adultos mayores' }
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

  return (
    <div className="login-page" style={{ '--c1': config.color }}>
      <div className="login-panel-left">
        <div className="login-left-top">
          <span className="login-eyebrow">Red</span>
          <h1 className="login-net-name">{config.nombre}</h1>
          <p className="login-net-desc">{config.desc}</p>
        </div>
        <button className="login-back-btn" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </div>

      <div className="login-panel-right">
        <h2 className="login-form-title">Ingresar</h2>

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

          <button className="btn-login" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        {isLoggedIn(red) && (
          <button className="btn-entrar-directo" onClick={() => navigate(`/${red}`)}>
            Sesion activa — Entrar directo
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
