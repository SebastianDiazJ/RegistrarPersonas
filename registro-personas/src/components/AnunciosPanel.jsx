import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { crearAnuncio, getAnuncios, getEnvios, DESTINOS } from '../services/anuncioService';
import { sanitizeText } from '../utils/validacion';

const fmt = (d) => (d
  ? d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—');

const ESTADO = {
  pendiente: { label: 'Pendiente', cls: 'pg-estado-pend' },
  enviando:  { label: 'Enviando',  cls: 'pg-estado-pend' },
  enviado:   { label: 'Enviado',   cls: 'pg-estado-ok' },
  simulado:  { label: 'Simulado',  cls: 'pg-estado-pend' },
  error:     { label: 'Error',     cls: 'pg-estado-err' }
};

const TIPO = { bienvenida: 'Bienvenida', cumpleanos: 'Cumpleaños', aviso_lider: 'Aviso a líder', anuncio: 'Anuncio' };

const enlaceWhatsApp = (a) =>
  `https://wa.me/?text=${encodeURIComponent(`*${a.titulo}*\n\n${a.mensaje}`)}`;

// Anuncios por correo (los envía el workflow de GitHub Actions) y registro de correos
// automáticos. Solo admin/pastor; las reglas de Firestore lo exigen también.
const AnunciosPanel = () => {
  const { isAdminLoggedIn, isPastorLoggedIn } = useAuth();
  const permitido = isAdminLoggedIn() || isPastorLoggedIn();

  const [titulo, setTitulo]   = useState('');
  const [mensaje, setMensaje] = useState('');
  const [destino, setDestino] = useState('todos');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [anuncios, setAnuncios] = useState([]);
  const [envios, setEnvios]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const cargar = async () => {
    setLoading(true);
    const [a, e] = await Promise.all([getAnuncios(), getEnvios()]);
    if (a.success) setAnuncios(a.data); else setError(a.error);
    if (e.success) setEnvios(e.data);
    setLoading(false);
  };

  useEffect(() => { if (permitido) cargar(); }, [permitido]);

  if (!permitido) return null;

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setEnviando(true);
    setFeedback(null);
    const res = await crearAnuncio({ titulo, mensaje, destino });
    if (res.success) {
      setFeedback({ ok: true, msg: 'Anuncio guardado. Se enviará por correo en los próximos minutos.' });
      setTitulo(''); setMensaje('');
      cargar();
    } else {
      setFeedback({ ok: false, msg: res.error });
    }
    setEnviando(false);
  };

  return (
    <div className="consol-consulta-card">
      <h2 className="consol-card-title">Nuevo anuncio</h2>
      <p className="masivo-aviso">
        Se envía por correo (Gmail) a las personas con correo registrado que no hayan cancelado su suscripción.
        Cada correo incluye un enlace para darse de baja. Para enviarlo también por mensaje, usa
        «Compartir por WhatsApp» en el anuncio ya guardado; el SMS no está incluido porque no existe una opción gratuita.
      </p>
      <form onSubmit={handleSubmit} noValidate className="consol-form" style={{ '--c1': '#1B2D45' }}>
        <div className="form-group">
          <label>Título (será el asunto del correo)</label>
          <input value={titulo} maxLength={100} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Culto especial este sábado" autoComplete="off" />
        </div>
        <div className="form-group">
          <label>Mensaje</label>
          <textarea value={mensaje} maxLength={3000} rows="6" onChange={e => setMensaje(e.target.value)} placeholder="Escribe el anuncio..." />
          <span className="masivo-aviso">{sanitizeText(mensaje, 3000).length}/3000 · Solo texto, sin código.</span>
        </div>
        <div className="form-group">
          <label>Destinatarios</label>
          <select value={destino} onChange={e => setDestino(e.target.value)}>
            {DESTINOS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        {feedback && <div className={feedback.ok ? 'consol-feedback-ok' : 'login-error'}>{feedback.msg}</div>}
        <button className="btn-submit" style={{ background: '#1B2D45' }} disabled={enviando}>
          {enviando ? 'Guardando...' : 'Guardar y enviar por correo'}
        </button>
      </form>

      <h2 className="consol-card-title" style={{ marginTop: '1.75rem' }}>Anuncios enviados</h2>
      {error && <div className="login-error">{error}</div>}
      {loading ? <div className="loading">Cargando...</div> : anuncios.length === 0 ? (
        <div className="plist-empty">Aún no hay anuncios</div>
      ) : (
        <div className="pg-table-scroll">
          <table className="pg-table">
            <thead><tr><th>Fecha</th><th>Título</th><th>Para</th><th>Estado</th><th>Enviados</th><th /></tr></thead>
            <tbody>
              {anuncios.map(a => (
                <tr key={a.id}>
                  <td>{fmt(a.creadoEn)}</td>
                  <td>{a.titulo}</td>
                  <td>{a.destino}</td>
                  <td><span className={`pg-estado ${ESTADO[a.estado]?.cls || ''}`}>{ESTADO[a.estado]?.label || a.estado}</span></td>
                  <td>{a.enviados}{a.total ? ` / ${a.total}` : ''}{a.errores ? ` · ${a.errores} con error` : ''}</td>
                  <td><a className="pg-link" href={enlaceWhatsApp(a)} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="consol-card-title" style={{ marginTop: '1.75rem' }}>Últimos correos automáticos</h2>
      {loading ? null : envios.length === 0 ? (
        <div className="plist-empty">Todavía no se ha enviado ningún correo</div>
      ) : (
        <div className="pg-table-scroll">
          <table className="pg-table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Persona</th><th>Estado</th></tr></thead>
            <tbody>
              {envios.map(e => (
                <tr key={e.id}>
                  <td>{fmt(e.ts)}</td>
                  <td>{TIPO[e.tipo] || e.tipo}</td>
                  <td>{e.nombre || '—'}</td>
                  <td><span className={`pg-estado ${ESTADO[e.estado]?.cls || ''}`}>{ESTADO[e.estado]?.label || e.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="btn-clear-filtros" onClick={cargar} disabled={loading} style={{ marginTop: '0.75rem' }}>Actualizar</button>
    </div>
  );
};

export default AnunciosPanel;
