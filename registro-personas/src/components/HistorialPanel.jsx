import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHistorial, ACCIONES, TIPOS_ACTOR } from '../services/historialService';

const fmt = (d) => (d
  ? d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  : '—');

const isoDia = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0] : '');

// Consulta de la bitácora (solo lectura). Solo admin/pastor; no hay forma de
// editar ni borrar entradas desde el cliente (las reglas lo impiden).
const HistorialPanel = () => {
  const { isAdminLoggedIn, isPastorLoggedIn } = useAuth();
  const permitido = isAdminLoggedIn() || isPastorLoggedIn();

  const [rows, setRows]       = useState([]);
  const [cursor, setCursor]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [abierto, setAbierto] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [accion, setAccion]     = useState('');
  const [tipo, setTipo]         = useState('');
  const [desde, setDesde]       = useState('');
  const [hasta, setHasta]       = useState('');

  const cargar = async (reiniciar = true) => {
    setLoading(true);
    const res = await getHistorial(reiniciar ? null : cursor);
    if (res.success) {
      setRows(prev => (reiniciar ? res.data : [...prev, ...res.data]));
      setCursor(res.cursor);
      setError('');
    } else setError(res.error);
    setLoading(false);
  };

  useEffect(() => { if (permitido) cargar(true); }, [permitido]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter(r => {
      if (accion && r.accion !== accion) return false;
      if (tipo && r.actorTipo !== tipo) return false;
      const dia = isoDia(r.ts);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      if (q && !`${r.actor} ${r.resumen} ${r.entidadId} ${r.red}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, busqueda, accion, tipo, desde, hasta]);

  if (!permitido) return null;

  return (
    <div className="consol-consulta-card">
      <div className="consulta-filtros">
        <div className="form-group" style={{ flex: '2', minWidth: '180px' }}>
          <label>Buscar (quién, qué, cédula/id)</label>
          <input className="search-input" value={busqueda} maxLength={60} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar en el historial..." autoComplete="off" />
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
          <label>Acción</label>
          <select className="filtro-cargo-select" value={accion} onChange={e => setAccion(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ACCIONES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '130px' }}>
          <label>Origen</label>
          <select className="filtro-cargo-select" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TIPOS_ACTOR).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '140px' }}>
          <label>Desde</label>
          <input className="filtro-cargo-select" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '140px' }}>
          <label>Hasta</label>
          <input className="filtro-cargo-select" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button className="btn-clear-filtros" onClick={() => cargar(true)} disabled={loading}>Actualizar</button>
      </div>

      {error && <div className="login-error">{error}</div>}

      <p className="plist-meta"><strong>{filtradas.length}</strong> de <strong>{rows.length}</strong> entradas cargadas</p>

      {loading && rows.length === 0 ? (
        <div className="loading">Cargando historial...</div>
      ) : filtradas.length === 0 ? (
        <div className="plist-empty">Sin entradas para los filtros aplicados</div>
      ) : (
        <div className="pg-table-scroll">
          <table className="pg-table">
            <thead>
              <tr><th>Fecha y hora</th><th>Quién</th><th>Acción</th><th>Registro</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              {filtradas.map(r => {
                const claves = [...new Set([...Object.keys(r.antes || {}), ...Object.keys(r.despues || {})])];
                const isOpen = abierto === r.id;
                return (
                  <tr key={r.id} className={claves.length ? 'pg-row-click' : ''} onClick={() => claves.length && setAbierto(isOpen ? null : r.id)}>
                    <td>{fmt(r.ts)}</td>
                    <td>{r.actor}<br /><span className="pg-chip">{TIPOS_ACTOR[r.actorTipo] || r.actorTipo}</span></td>
                    <td>{ACCIONES[r.accion] || r.accion}</td>
                    <td>{r.entidad}{r.entidadId ? ` · ${r.entidadId}` : ''}{r.red ? ` · ${r.red}` : ''}</td>
                    <td>
                      {r.resumen}
                      {isOpen && (
                        <ul className="pg-diff">
                          {claves.map(k => (
                            <li key={k}><strong>{k}:</strong> {String(r.antes?.[k] ?? '—') || '—'} → {String(r.despues?.[k] ?? '—') || '—'}</li>
                          ))}
                        </ul>
                      )}
                      {!isOpen && claves.length > 0 && <span className="pg-chip">ver valores</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {cursor && (
        <button className="btn-clear-filtros" onClick={() => cargar(false)} disabled={loading}>
          {loading ? 'Cargando...' : 'Cargar entradas anteriores'}
        </button>
      )}
    </div>
  );
};

export default HistorialPanel;
