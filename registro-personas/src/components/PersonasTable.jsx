import { useState, useMemo } from 'react';
import { deletePerson, updatePerson } from '../services/personService';
import { getCallAlertStatus } from '../services/callAlertService';

const initials = (p) =>
  ((p.nombre || '')[0] + (p.apellido || '')[0]).toUpperCase();

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
};

const RESULT_CONFIG = {
  contesto:    { label: 'Contestó',    cls: 'badge-contesto' },
  no_contesto: { label: 'No contestó', cls: 'badge-no-contesto' },
  desinteres:  { label: 'Desinterés',  cls: 'badge-desinteres' }
};

const PersonasTable = ({ personas, red, redConfig, busqueda, onRefresh, filtroServicio, filtroFecha }) => {
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy]         = useState('nombre');
  const [sortDir, setSortDir]       = useState('asc');

  const personasFiltradas = useMemo(() => {
    let list = personas;

    // Filtro texto
    if (busqueda) {
      const q = busqueda.toLowerCase();
      list = list.filter(p =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
        (p.telefono || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    }

    // Filtro asistencia por servicio + fecha
    if (filtroServicio && filtroServicio !== 'todos') {
      list = list.filter(p =>
        (p.asistencias || []).some(a => {
          const matchService = a.servicio === filtroServicio;
          const matchDate = filtroFecha ? a.fecha === filtroFecha : true;
          return matchService && a.asistio && matchDate;
        })
      );
    } else if (filtroFecha) {
      list = list.filter(p =>
        (p.asistencias || []).some(a => a.fecha === filtroFecha && a.asistio)
      );
    }

    // Ordenar
    return [...list].sort((a, b) => {
      let av, bv;
      switch (sortBy) {
        case 'nombre':       av = `${a.nombre} ${a.apellido}`.toLowerCase(); bv = `${b.nombre} ${b.apellido}`.toLowerCase(); break;
        case 'ultimallamada': av = new Date(a.lastCallDate || 0); bv = new Date(b.lastCallDate || 0); break;
        case 'ingreso':      av = new Date(a.fechaIngreso || 0); bv = new Date(b.fechaIngreso || 0); break;
        case 'asistencias':  av = (a.asistencias || []).length; bv = (b.asistencias || []).length; break;
        default: return 0;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [personas, busqueda, filtroServicio, filtroFecha, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortIcon = (col) => {
    if (sortBy !== col) return <span className="sort-icon sort-idle">↕</span>;
    return <span className="sort-icon sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleEdit = (p) => { setEditingId(p.id); setEditForm({ ...p }); };

  const handleSave = async () => {
    if (editingId && editForm) {
      const res = await updatePerson(red, editingId, editForm);
      if (res.success) { setEditingId(null); setEditForm(null); onRefresh(); }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Eliminar esta persona?')) {
      const res = await deletePerson(red, id);
      if (res.success) onRefresh();
    }
  };

  const handleMarkCalled = async (id) => {
    const res = await updatePerson(red, id, { lastCallDate: new Date().toISOString(), callConfirmed: true });
    if (res.success) onRefresh();
  };

  if (personasFiltradas.length === 0) {
    return (
      <div className="plist-empty">
        {busqueda || filtroServicio || filtroFecha
          ? 'Sin resultados para los filtros aplicados'
          : 'No hay personas registradas en esta red'}
      </div>
    );
  }

  return (
    <div className="plist-wrap">
      {/* Meta */}
      <p className="plist-meta">
        <strong>{personasFiltradas.length}</strong> de <strong>{personas.length}</strong> personas
      </p>

      {/* Header */}
      <div className="plist-header">
        <button className="plist-th plist-th-name" onClick={() => toggleSort('nombre')}>
          Persona {sortIcon('nombre')}
        </button>
        <span className="plist-th plist-th-contact hide-sm">Contacto</span>
        <button className="plist-th plist-th-att hide-md" onClick={() => toggleSort('asistencias')}>
          Asistencia {sortIcon('asistencias')}
        </button>
        <button className="plist-th plist-th-call hide-md" onClick={() => toggleSort('ultimallamada')}>
          Última llamada {sortIcon('ultimallamada')}
        </button>
        <button className="plist-th plist-th-ingreso hide-md" onClick={() => toggleSort('ingreso')}>
          Ingreso {sortIcon('ingreso')}
        </button>
        <span className="plist-th plist-th-actions">Acciones</span>
      </div>

      {/* Rows */}
      <div className="plist-body">
        {personasFiltradas.map(p => {
          const callStatus  = getCallAlertStatus(p);
          const isEditing   = editingId === p.id;
          const isExpanded  = expandedId === p.id;
          const lastAtt     = [...(p.asistencias || [])].sort((a, b) => b.id - a.id).slice(0, 6);
          const lastCall    = [...(p.llamadas || [])].sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))[0];
          const callCfg     = lastCall ? RESULT_CONFIG[lastCall.resultado] : null;
          const metodoShort = p.metodoInvitacion ? p.metodoInvitacion.substring(0, 12) : null;

          return (
            <div key={p.id} className={`plist-item ${callStatus.isAlert ? 'plist-alert' : ''}`}>
              {/* Main row */}
              <div
                className={`plist-row ${isExpanded ? 'plist-row-open' : ''}`}
                onClick={() => !isEditing && setExpandedId(isExpanded ? null : p.id)}
              >
                {/* Avatar + nombre */}
                <div className="plist-cell plist-cell-name">
                  <div
                    className="plist-avatar"
                    style={{ background: redConfig.color }}
                  >
                    {initials(p)}
                  </div>
                  {isEditing ? (
                    <div className="edit-name-wrap">
                      <input
                        className="edit-input"
                        value={editForm.nombre}
                        onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                        placeholder="Nombre"
                        onClick={e => e.stopPropagation()}
                      />
                      <input
                        className="edit-input"
                        value={editForm.apellido}
                        onChange={e => setEditForm(f => ({ ...f, apellido: e.target.value }))}
                        placeholder="Apellido"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <div className="plist-name-stack">
                      <span className="plist-fullname">{p.nombre} {p.apellido}</span>
                      {p.aCargoDe && <span className="plist-cargo">Lider: {p.aCargoDe}</span>}
                      {metodoShort && <span className="plist-metodo">{metodoShort}</span>}
                    </div>
                  )}
                </div>

                {/* Contacto */}
                <div className="plist-cell plist-cell-contact hide-sm" onClick={e => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <input className="edit-input" value={editForm.telefono || ''} onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value }))} placeholder="Teléfono" type="tel" />
                      <input className="edit-input" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" type="email" />
                    </>
                  ) : (
                    <>
                      {p.telefono && <a className="plist-tel-link" href={`tel:${p.telefono}`}>{p.telefono}</a>}
                      {p.email && <span className="plist-email-text" title={p.email}>{p.email.length > 22 ? p.email.substring(0, 20) + '…' : p.email}</span>}
                    </>
                  )}
                </div>

                {/* Asistencia chips */}
                <div className="plist-cell plist-cell-att hide-md">
                  {lastAtt.length === 0 ? (
                    <span className="plist-none">—</span>
                  ) : (
                    <div className="plist-att-chips">
                      {lastAtt.map(a => (
                        <span
                          key={a.id}
                          className={`patt-chip ${a.asistio ? 'patt-ok' : 'patt-no'}`}
                          title={`${a.fecha} — ${a.servicio}`}
                        >
                          {a.asistio ? '✓' : '✗'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Última llamada */}
                <div className="plist-cell plist-cell-call hide-md">
                  {callCfg ? (
                    <div className="plist-call-stack">
                      <span className={`plist-call-badge ${callCfg.cls}`}>{callCfg.label}</span>
                      <span className="plist-call-date">{fmtDate(lastCall.ts)}</span>
                    </div>
                  ) : (
                    <span className="plist-none">Sin registrar</span>
                  )}
                </div>

                {/* Fecha ingreso */}
                <div className="plist-cell plist-cell-ingreso hide-md">
                  {isEditing ? (
                    <input className="edit-input" type="date" value={editForm.fechaIngreso || ''} onChange={e => setEditForm(f => ({ ...f, fechaIngreso: e.target.value }))} onClick={e => e.stopPropagation()} />
                  ) : (
                    <span className="plist-ingreso-date">{fmtDate(p.fechaIngreso)}</span>
                  )}
                </div>

                {/* Acciones */}
                <div className="plist-cell plist-cell-actions" onClick={e => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <button className="pact-btn pact-save" onClick={handleSave}>Guardar</button>
                      <button className="pact-btn pact-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="pact-btn pact-edit" onClick={() => handleEdit(p)}>Editar</button>
                      <button className="pact-btn pact-call" onClick={() => handleMarkCalled(p.id)} title="Marcar contactado">Llame</button>
                      <button className="pact-btn pact-del" onClick={() => handleDelete(p.id)}>×</button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && !isEditing && (
                <div className="plist-detail" style={{ borderLeftColor: redConfig.color }}>
                  <div className="pdetail-grid">
                    {p.telefono && (
                      <div className="pdetail-row">
                        <span className="pdetail-label">Teléfono</span>
                        <a className="pdetail-link" href={`tel:${p.telefono}`}>{p.telefono}</a>
                      </div>
                    )}
                    {p.email && (
                      <div className="pdetail-row">
                        <span className="pdetail-label">Email</span>
                        <a className="pdetail-link" href={`mailto:${p.email}`}>{p.email}</a>
                      </div>
                    )}
                    {p.edad && (
                      <div className="pdetail-row">
                        <span className="pdetail-label">Edad</span>
                        <span>{p.edad} años</span>
                      </div>
                    )}
                    {p.fechaIngreso && (
                      <div className="pdetail-row">
                        <span className="pdetail-label">Fecha ingreso</span>
                        <span>{fmtDate(p.fechaIngreso)}</span>
                      </div>
                    )}
                    {p.metodoInvitacion && (
                      <div className="pdetail-row">
                        <span className="pdetail-label">Llegó por</span>
                        <span>{p.metodoInvitacion}</span>
                      </div>
                    )}
                    {p.aCargoDe && (
                      <div className="pdetail-row">
                        <span className="pdetail-label">Líder</span>
                        <span>{p.aCargoDe}</span>
                      </div>
                    )}
                    {p.prayerRequest && (
                      <div className="pdetail-row pdetail-full">
                        <span className="pdetail-label">Oración</span>
                        <span className="pdetail-prayer">{p.prayerRequest}</span>
                      </div>
                    )}
                  </div>

                  {/* Historial asistencias */}
                  {(p.asistencias || []).length > 0 && (
                    <div className="pdetail-att-history">
                      <span className="pdetail-label">Historial asistencia</span>
                      <div className="pdetail-att-chips">
                        {[...(p.asistencias || [])].sort((a, b) => b.id - a.id).slice(0, 15).map(a => (
                          <span key={a.id} className={`patt-chip-lg ${a.asistio ? 'patt-ok' : 'patt-no'}`} title={a.servicio}>
                            <span className="patt-mark">{a.asistio ? '✓' : '✗'}</span>
                            <span className="patt-date">{a.fecha?.substring(5)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historial llamadas */}
                  {(p.llamadas || []).length > 0 && (
                    <div className="pdetail-att-history">
                      <span className="pdetail-label">Historial llamadas</span>
                      <div className="pdetail-att-chips">
                        {[...(p.llamadas || [])].sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).slice(0, 8).map((l, i) => {
                          const cfg = RESULT_CONFIG[l.resultado] || { label: l.resultado, cls: '' };
                          return (
                            <span key={i} className={`patt-chip-lg ${cfg.cls}`}>
                              <span className="patt-mark">{cfg.label}</span>
                              <span className="patt-date">{l.fecha}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonasTable;
