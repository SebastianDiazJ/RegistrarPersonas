import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onlyLetters } from '../utils/validacion';

// "Ingreso masivo": acceso SIN contraseña. Solo pide el nombre de quien va a
// diligenciar información; ese nombre queda en el historial con cada cambio.
const MasivoLogin = () => {
  const [nombre, setNombre]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { startMasivo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await startMasivo(nombre);
    if (result.success) navigate('/masivo');
    else setError(result.error);
    setLoading(false);
  };

  return (
    <div className="consol-login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Ingreso masivo</h1>
          <p className="login-subtitle">Acceso sin contraseña para diligenciar información</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Tu nombre completo</label>
            <input
              value={nombre}
              onChange={e => setNombre(onlyLetters(e.target.value).slice(0, 80))}
              placeholder="¿Quién va a diligenciar?"
              autoComplete="name"
              required
            />
          </div>
          <p className="masivo-aviso">
            Tu nombre se guarda en el historial de cambios con cada registro que hagas.
          </p>

          {error && <div className="login-error">{error}</div>}

          <button className="btn-login consol-btn-login" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar al ingreso masivo'}
          </button>
        </form>

        <button className="btn-back-lobby" onClick={() => navigate('/')}>
          Volver al Lobby
        </button>
      </div>
    </div>
  );
};

export default MasivoLogin;
