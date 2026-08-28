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
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const config = REDES_CONFIG[red];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(red, red, password);
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
            <label>Contrasena</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contrasena de acceso"
                autoComplete="current-password"
                required
                style={{ flex: 1, paddingRight: '4rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: '0.6rem',
                  background: 'none', border: 'none',
                  color: 'var(--t2)', fontSize: '0.72rem',
                  fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.3px'
                }}
              >
                {showPwd ? 'Ocultar' : 'Ver'}
              </button>
            </div>
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
