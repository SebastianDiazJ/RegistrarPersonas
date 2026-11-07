import { useState, useMemo } from 'react';
import { MESES } from '../config/opciones';
import { REDES_MAP } from '../config/redes';
import { exportarPersonasExcel } from '../utils/excel';
import { sanitizeText } from '../utils/validacion';

const ORDENES = [
  { id: 'apellido',     label: 'Apellido' },
  { id: 'fechaIngreso', label: 'Fecha de ingreso' },
  { id: 'aCargoDe',     label: 'Persona a cargo' },
  { id: 'cumple',       label: 'Cumpleaños' }
];

const cumpleKey = (p) =>
  p.mesCumple && p.diaCumple ? Number(p.mesCumple) * 100 + Number(p.diaCumple) : 9999;

const comparar = (orden) => (a, b) => {
  switch (orden) {
    case 'fechaIngreso': return (a.fechaIngreso || '').localeCompare(b.fechaIngreso || '');
    case 'aCargoDe':     return (a.aCargoDe || '').localeCompare(b.aCargoDe || '', 'es');
    case 'cumple':       return cumpleKey(a) - cumpleKey(b);
    default:             return `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es');
  }
};

// Tabla con filtros, orden y exportación a Excel. React escapa todo el texto que
// se pinta aquí; no se usa innerHTML en ningún punto.
const PersonasGeneralTable = ({ personas, nombreArchivo = 'personas', onExport }) => {
  const [busqueda, setBusqueda]   = useState('');
  const [aCargo, setACargo]       = useState('');
  const [mes, setMes]             = useState('');
  const [desde, setDesde]         = useState('');
  const [hasta, setHasta]         = useState('');
  const [asiste, setAsiste]       = useState('todos');
  const [orden, setOrden]         = useState('apellido');
  const [desc, setDesc]           = useState(false);
  const [exportando, setExportando] = useState(false);

  const filtradas = useMemo(() => {
    const q = sanitizeText(busqueda, 60).toLowerCase();
    const c = sanitizeText(aCargo, 60).toLowerCase();
    const lista = personas.filter(p => {
      if (q && !`${p.cedula} ${p.nombre} ${p.apellido}`.toLowerCase().includes(q)) return false;
      if (c && !(p.aCargoDe || '').toLowerCase().includes(c)) return false;
      if (mes && String(p.mesCumple) !== mes) return false;
      if (desde && (p.fechaIngreso || '') < desde) return false;
      if (hasta && (p.fechaIngreso || '') > hasta) return false;
      if (asiste === 'si' && !p.asiste) return false;
      if (asiste === 'no' && p.asiste) return false;
      return true;
    }).sort(comparar(orden));
    return desc ? lista.reverse() : lista;
  }, [personas, busqueda, aCargo, mes, desde, hasta, asiste, orden, desc]);

  const hayFiltros = busqueda || aCargo || mes || desde || hasta || asiste !== 'todos';
  const limpiar = () => { setBusqueda(''); setACargo(''); setMes(''); setDesde(''); setHasta(''); setAsiste('todos'); };

  const handleExport = async () => {
    setExportando(true);
    try {
      await exportarPersonasExcel(filtradas, nombreArchivo);
      if (onExport) await onExport(filtradas.length);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="pg-wrap">
      <div className="consulta-filtros">
        <div className="form-group" style={{ flex: '2', minWidth: '170px' }}>
          <label>Buscar (cédula, nombre, apellido)</label>
          <input className="search-input" value={busqueda} maxLength={60} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..." autoComplete="off" />
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
          <label>Persona a cargo</label>
          <input className="filtro-cargo-select" value={aCargo} maxLength={60} onChange={e => setACargo(e.target.value)} placeholder="Nombre del líder" autoComplete="off" />
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '130px' }}>
          <label>Mes de cumpleaños</label>
          <select className="filtro-cargo-select" value={mes} onChange={e => setMes(e.target.value)}>
            <option value="">Todos</option>
            {MESES.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '140px' }}>
          <label>Ingreso desde</label>
          <input className="filtro-cargo-select" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '140px' }}>
          <label>Ingreso hasta</label>
          <input className="filtro-cargo-select" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '110px' }}>
          <label>Asiste</label>
          <select className="filtro-cargo-select" value={asiste} onChange={e => setAsiste(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="si">Sí asisten</option>
            <option value="no">No asisten</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
          <label>Ordenar por</label>
          <div className="pg-orden-row">
            <select className="filtro-cargo-select" value={orden} onChange={e => setOrden(e.target.value)}>
              {ORDENES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <button type="button" className="btn-clear-filtros" onClick={() => setDesc(d => !d)} title="Invertir orden">
              {desc ? '↓' : '↑'}
            </button>
          </div>
        </div>
        {hayFiltros && <button className="btn-clear-filtros" onClick={limpiar}>Limpiar filtros</button>}
      </div>

      <div className="pg-toolbar">
        <p className="plist-meta"><strong>{filtradas.length}</strong> de <strong>{personas.length}</strong> personas</p>
        <button type="button" className="pg-btn-excel" onClick={handleExport} disabled={exportando || filtradas.length === 0}>
          {exportando ? 'Generando...' : 'Exportar a Excel'}
        </button>
      </div>

      {filtradas.length === 0 ? (
        <div className="plist-empty">{hayFiltros ? 'Sin resultados para los filtros aplicados' : 'Aún no hay personas'}</div>
      ) : (
        <div className="pg-table-scroll">
          <table className="pg-table">
            <thead>
              <tr>
                <th>Cédula</th><th>Apellido</th><th>Nombre</th><th>Teléfono</th>
                <th>Cumpleaños</th><th>Pareja</th><th>Asiste</th><th>Red</th>
                <th>A cargo de</th><th>Ingreso</th><th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(p => (
                <tr key={p.cedula}>
                  <td>{p.cedula}</td>
                  <td>{p.apellido}</td>
                  <td>{p.nombre}</td>
                  <td>{p.telefono || '—'}</td>
                  <td>{p.mesCumple && p.diaCumple ? `${p.diaCumple} ${MESES[Number(p.mesCumple) - 1]?.substring(0, 3) || ''}` : '—'}</td>
                  <td>{p.parejaCedula || '—'}</td>
                  <td>{p.asiste ? 'Sí' : 'No'}</td>
                  <td>{p.redAsignada ? REDES_MAP[p.redAsignada]?.nombre || '—' : '—'}</td>
                  <td>{p.aCargoDe || '—'}</td>
                  <td>{p.fechaIngreso || '—'}</td>
                  <td>{p.creadoPor || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PersonasGeneralTable;
