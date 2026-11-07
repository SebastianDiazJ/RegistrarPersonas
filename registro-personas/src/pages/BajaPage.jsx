import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sanitizeEmail, isValidEmail } from '../utils/validacion';

// SHA-256 del correo normalizado (mismo cálculo que el workflow de notificaciones).
const hashEmail = async (email) => {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
};

// Página pública para dejar de recibir correos. Guarda solo el hash del correo: nadie
// puede leer la lista de bajas desde el navegador.
const BajaPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(sanitizeEmail(params.get('e') || ''));
  const [estado, setEstado] = useState(null); // null | 'ok' | 'error'
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const limpio = sanitizeEmail(email);
    if (!limpio || !isValidEmail(limpio)) { setError('Escribe un correo válido.'); return; }
    setEnviando(true);
    try {
      await setDoc(doc(db, 'bajas', await hashEmail(limpio)), { fecha: serverTimestamp() });
      setEstado('ok');
    } catch {
      setEstado('error');
    }
    setEnviando(false);
  };

  return (
    <div className="consol-login-page">
      <div className="login-card">
        <div className="login-header">
          <img className="lobby-logo" src="/logo-lavid.webp" alt="Iglesia La Vid" width="64" height="64" style={{ margin: '0 auto 0.75rem' }} />
          <h1 className="login-title">Cancelar suscripción</h1>
          <p className="login-subtitle">Iglesia La Vid</p>
        </div>

        {estado === 'ok' ? (
          <div className="consol-feedback-ok">
            Listo. Ya no enviaremos correos de la iglesia a esa dirección. Si fue un error, comunícate con el equipo pastoral.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <p className="masivo-aviso">Confirma el correo con el que no quieres recibir más mensajes (bienvenida, cumpleaños y anuncios).</p>
            <div className="form-group">
              <label>Correo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value.slice(0, 100))} autoComplete="email" required />
            </div>
            {error && <div className="login-error">{error}</div>}
            {estado === 'error' && <div className="login-error">No se pudo registrar la baja. Si ya la habías cancelado antes, no hace falta repetirla; si no, intenta de nuevo más tarde.</div>}
            <button className="btn-login consol-btn-login" disabled={enviando}>
              {enviando ? 'Guardando...' : 'Confirmar baja'}
            </button>
          </form>
        )}

        <button className="btn-back-lobby" onClick={() => navigate('/')}>Ir al inicio</button>
      </div>
    </div>
  );
};

export default BajaPage;
