import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { REDES } from '../config/redes';
import { getAllPersons } from '../services/personService';
import { getAllRedesInfo, updateRedLeaderInfo } from '../services/redService';
import { computeRedStats, computeLeaderBreakdown } from '../services/statsService';
import { getCallAlertSummary } from '../services/callAlertService';
import PersonasTable from '../components/PersonasTable';

const SERVICIOS_LABEL = { sabado: 'Sábado', domingo: 'Domingo', miercoles: 'Miércoles' };

const todayISO = () => new Date().toISOString().split('T')[0];
const thirtyDaysAgoISO = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const PastoralPanel = () => {
  const navigate = useNavigate();
  const { logoutPastor } = useAuth();

  const [activeTab, setActiveTab] = useState('resumen');
  const [rawPersonas, setRawPersonas] = useState({});
  const [redesInfo, setRedesInfo] = useState({});
  const [loading, setLoading] = useState(true);

  // Personas tab
  const [redConsulta, setRedConsulta] = useState('xtreme');
  const [busqueda, setBusqueda] = useState('');
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('');

  // Estadisticas tab
  const [statsDesde, setStatsDesde] = useState(thirtyDaysAgoISO());
  const [statsHasta, setStatsHasta] = useState(todayISO());

  // Lideres tab
  const [leaderDrafts, setLeaderDrafts] = useState({});
  const [savingRed, setSavingRed] = useState(null);
  const [savedFeedback, setSavedFeedback] = useState(null);
  const [expandedBreakdown, setExpandedBreakdown] = useState(null); // `${redId}::${nombre}`

  const loadAll = async () => {
    setLoading(true);
    const [personResults, info] = await Promise.all([
      Promise.all(REDES.map(r => getAllPersons(r.id))),
      getAllRedesInfo(REDES.map(r => r.id))
    ]);
    const rawMap = {};
    REDES.forEach((r, i) => { rawMap[r.id] = personResults[i].success ? personResults[i].data : []; });
    setRawPersonas(rawMap);
    setRedesInfo(info);
    const drafts = {};
    REDES.forEach(r => {
      drafts[r.id] = {
        liderNombre: info[r.id]?.liderNombre || '',
        whatsapp: info[r.id]?.whatsapp || ''
      };
    });
    setLeaderDrafts(drafts);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleLogout = async () => { await logoutPastor(); navigate('/'); };

  const statsByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => {
      map[r.id] = computeRedStats(rawPersonas[r.id] || [], { desde: statsDesde, hasta: statsHasta });
    });
    return map;
  }, [rawPersonas, statsDesde, statsHasta]);

  const callSummaryByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => { map[r.id] = getCallAlertSummary(rawPersonas[r.id] || []); });
    return map;
  }, [rawPersonas]);

  const leaderBreakdownByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => { map[r.id] = computeLeaderBreakdown(rawPersonas[r.id] || []); });
    return map;
  }, [rawPersonas]);

  const globalTotals = useMemo(() => {
    let total = 0, contactados = 0, pendientes = 0, nuncaContactados = 0, nuevosEsteMes = 0;
    REDES.forEach(r => {
      const cs = callSummaryByRed[r.id];
      const st = statsByRed[r.id];
      if (cs) {
        total += cs.total;
        contactados += cs.upToDate;
        pendientes += cs.needingCall;
        nuncaContactados += cs.neverCalled;
      }
      if (st) nuevosEsteMes += st.nuevosEsteMes;
    });
    return { total, contactados, pendientes, nuncaContactados, nuevosEsteMes };
  }, [callSummaryByRed, statsByRed]);

  const redConsultaConfig = REDES.find(r => r.id === redConsulta);

  const handleDraftChange = (redId, field) => (e) => {
    setLeaderDrafts(d => ({ ...d, [redId]: { ...d[redId], [field]: e.target.value } }));
  };

  const toggleBreakdown = (redId, nombre) => {
    const key = `${redId}::${nombre}`;
    setExpandedBreakdown(prev => (prev === key ? null : key));
  };

  const getBreakdownPersonas = (redId, nombre) => {
    return (rawPersonas[redId] || []).filter(p => {
      const key = (p.aCargoDe || '').trim() || 'Sin asignar';
      return key === nombre;
    });
  };

  const handleSaveLeader = async (redId) => {
    setSavingRed(redId);
    setSavedFeedback(null);
    const draft = leaderDrafts[redId];
    const result = await updateRedLeaderInfo(redId, {
      liderNombre: draft.liderNombre.trim(),
      whatsapp: draft.whatsapp.trim()
    });
    if (result.success) {
      setRedesInfo(prev => ({ ...prev, [redId]: { ...prev[redId], ...draft } }));
      setSavedFeedback({ redId, ok: true });
    } else {
      setSavedFeedback({ redId, ok: false, msg: result.error });
    }
    setSavingRed(null);
  };

  return (
    <div className="consol-panel">
      <div className="consol-header">
        <div className="consol-header-left">
          <h1 className="consol-title">Pastoral</h1>
          <p className="consol-subtitle">Vista general del CRM — todas las redes</p>
        </div>
        <div className="consol-header-right">
          <button className="btn-lobby" onClick={() => navigate('/')}>Lobby</button>
          <button className="btn-cerrar-sesion" onClick={handleLogout}>Cerrar sesion</button>
        </div>
      </div>

      <div className="consol-body">
        {loading ? (
          <div className="loading">Cargando información pastoral...</div>
        ) : (
          <>
            {/* KPIs globales */}
            <div className="consol-stats-row">
              <div className="consol-total-card">
                <span className="consol-total-num">{globalTotals.total}</span>
                <span className="consol-total-label">Total personas</span>
              </div>
              {REDES.map(red => (
                <div key={red.id} className="consol-net-stat" style={{ '--c1': red.color }}>
                  <span className="consol-net-count-big">{(rawPersonas[red.id] || []).length}</span>
                  <span className="consol-net-name">{red.nombre}</span>
                </div>
              ))}
            </div>

            <div className="pastoral-kpi-row">
              <div className="stats-kpi">
                <span className="stats-kpi-num" style={{ color: '#059669' }}>{globalTotals.contactados}</span>
                <span className="stats-kpi-label">Contactados al día</span>
              </div>
              <div className="stats-kpi">
                <span className="stats-kpi-num" style={{ color: '#DC2626' }}>{globalTotals.pendientes}</span>
                <span className="stats-kpi-label">Pendientes 48h+</span>
              </div>
              <div className="stats-kpi">
                <span className="stats-kpi-num" style={{ color: '#D97706' }}>{globalTotals.nuncaContactados}</span>
                <span className="stats-kpi-label">Nunca contactados</span>
              </div>
              <div className="stats-kpi">
                <span className="stats-kpi-num">{globalTotals.nuevosEsteMes}</span>
                <span className="stats-kpi-label">Nuevos este mes</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="consol-main-tabs">
              {[
                { id: 'resumen',      label: 'Resumen general' },
                { id: 'personas',     label: 'Personas por red' },
                { id: 'lideres',      label: 'Líderes y contacto' },
                { id: 'estadisticas', label: 'Estadísticas comparativas' }
              ].map(t => (
                <button
                  key={t.id}
                  className={`consol-main-tab ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Resumen ── */}
            {activeTab === 'resumen' && (
              <div className="pastoral-resumen-grid">
                {REDES.map(red => {
                  const cs = callSummaryByRed[red.id];
                  const st = statsByRed[red.id];
                  const lider = redesInfo[red.id]?.liderNombre;
                  return (
                    <div key={red.id} className="pastoral-red-card" style={{ '--c1': red.color }}>
                      <div className="pastoral-red-card-header">
                        <span className="pastoral-red-name">{red.nombre}</span>
                        <span className="pastoral-red-count">{cs.total}</span>
                      </div>
                      {lider && <p className="pastoral-red-lider">Líder: {lider}</p>}
                      <div className="pastoral-red-bar-track">
                        <div className="pastoral-red-bar-fill" style={{ width: `${cs.percentage}%`, background: red.color }} />
                      </div>
                      <span className="pastoral-red-pct">{cs.percentage}% al día en llamadas</span>
                      <div className="pastoral-red-mini-kpis">
                        <div><strong>{cs.needingCall}</strong><span>Pendientes</span></div>
                        <div><strong>{cs.neverCalled}</strong><span>Sin contactar</span></div>
                        <div><strong>{st.nuevosEsteMes}</strong><span>Nuevos/mes</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Personas por red ── */}
            {activeTab === 'personas' && (
              <div className="consol-consulta-card">
                <div className="consol-red-tabs">
                  {REDES.map(red => (
                    <button
                      key={red.id}
                      type="button"
                      className={`consol-red-tab ${redConsulta === red.id ? 'active' : ''}`}
                      style={{ '--c1': red.color }}
                      onClick={() => { setRedConsulta(red.id); setBusqueda(''); setFiltroServicio('todos'); setFiltroFecha(''); }}
                    >
                      {red.nombre}
                      <span className="consol-tab-badge">{(rawPersonas[red.id] || []).length}</span>
                    </button>
                  ))}
                </div>

                <div className="consulta-filtros">
                  <div className="form-group" style={{ flex: '2', minWidth: '180px' }}>
                    <label>Buscar</label>
                    <input
                      className="search-input"
                      type="text"
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      placeholder="Nombre, teléfono, email..."
                      style={{ '--c1': redConsultaConfig.color }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '130px' }}>
                    <label>Servicio asistido</label>
                    <select className="filtro-cargo-select" value={filtroServicio} onChange={e => setFiltroServicio(e.target.value)}>
                      <option value="todos">Todos</option>
                      <option value="sabado">Sábado</option>
                      <option value="domingo">Domingo</option>
                      <option value="miercoles">Miércoles</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '140px' }}>
                    <label>Fecha asistencia</label>
                    <input
                      className="filtro-cargo-select"
                      type="date"
                      value={filtroFecha}
                      onChange={e => setFiltroFecha(e.target.value)}
                    />
                  </div>
                  {(filtroServicio !== 'todos' || filtroFecha) && (
                    <button className="btn-clear-filtros" onClick={() => { setFiltroServicio('todos'); setFiltroFecha(''); }}>
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <PersonasTable
                  personas={rawPersonas[redConsulta] || []}
                  red={redConsulta}
                  redConfig={redConsultaConfig}
                  busqueda={busqueda}
                  filtroServicio={filtroServicio !== 'todos' ? filtroServicio : ''}
                  filtroFecha={filtroFecha}
                  onRefresh={loadAll}
                />
              </div>
            )}

            {/* ── Lideres y contacto ── */}
            {activeTab === 'lideres' && (
              <div className="pastoral-lideres-grid">
                {REDES.map(red => {
                  const draft = leaderDrafts[red.id] || { liderNombre: '', whatsapp: '' };
                  const breakdown = leaderBreakdownByRed[red.id] || [];
                  const feedback = savedFeedback && savedFeedback.redId === red.id ? savedFeedback : null;
                  return (
                    <div key={red.id} className="pastoral-lider-card" style={{ '--c1': red.color }}>
                      <div className="pastoral-red-card-header">
                        <span className="pastoral-red-name">{red.nombre}</span>
                        <span className="pastoral-red-count">{(rawPersonas[red.id] || []).length}</span>
                      </div>

                      <div className="form-group">
                        <label>Nombre del líder de red</label>
                        <input
                          value={draft.liderNombre}
                          onChange={handleDraftChange(red.id, 'liderNombre')}
                          placeholder="Nombre del líder"
                        />
                      </div>
                      <div className="form-group">
                        <label>WhatsApp del líder</label>
                        <input
                          value={draft.whatsapp}
                          onChange={handleDraftChange(red.id, 'whatsapp')}
                          placeholder="Ej: 573001234567"
                          type="tel"
                        />
                      </div>

                      {feedback && (
                        <div className={feedback.ok ? 'consol-feedback-ok' : 'login-error'}>
                          {feedback.ok ? 'Datos guardados' : feedback.msg}
                        </div>
                      )}

                      <button
                        className="btn-submit"
                        style={{ background: red.color }}
                        disabled={savingRed === red.id}
                        onClick={() => handleSaveLeader(red.id)}
                      >
                        {savingRed === red.id ? 'Guardando...' : 'Guardar contacto'}
                      </button>

                      {breakdown.length > 0 && (
                        <div className="pastoral-breakdown">
                          <span className="pastoral-breakdown-title">Responsables internos (a cargo de)</span>
                          <div className="pastoral-breakdown-list">
                            {breakdown.map(b => {
                              const key = `${red.id}::${b.nombre}`;
                              const isOpen = expandedBreakdown === key;
                              const personasGrupo = isOpen ? getBreakdownPersonas(red.id, b.nombre) : [];
                              return (
                                <div key={b.nombre}>
                                  <button
                                    type="button"
                                    className={`pastoral-breakdown-row pastoral-breakdown-row-btn ${isOpen ? 'open' : ''}`}
                                    onClick={() => toggleBreakdown(red.id, b.nombre)}
                                  >
                                    <span className="pastoral-breakdown-nombre">{b.nombre}</span>
                                    <span className="pastoral-breakdown-total">{b.total} personas</span>
                                    <span className="pastoral-breakdown-ok">{b.contactados} contactadas</span>
                                    {b.pendientes > 0 && (
                                      <span className="pastoral-breakdown-pend">{b.pendientes} pendientes</span>
                                    )}
                                  </button>
                                  {isOpen && (
                                    <div className="pastoral-breakdown-personas">
                                      {personasGrupo.map(p => (
                                        <div key={p.id} className="pastoral-breakdown-persona">
                                          <span className="pastoral-breakdown-persona-nombre">{p.nombre} {p.apellido}</span>
                                          {p.telefono && (
                                            <a className="pastoral-breakdown-persona-tel" href={`tel:${p.telefono}`}>{p.telefono}</a>
                                          )}
                                          <span className={`pastoral-breakdown-persona-status ${p.lastCallDate ? 'ok' : 'pend'}`}>
                                            {p.lastCallDate ? 'Contactada' : 'Pendiente'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Estadisticas comparativas ── */}
            {activeTab === 'estadisticas' && (
              <div className="consol-stats-detail">
                <div className="stats-date-filter">
                  <span className="stats-date-label">Período:</span>
                  <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                    <label>Desde</label>
                    <input type="date" value={statsDesde} onChange={e => setStatsDesde(e.target.value)} className="filtro-cargo-select" />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                    <label>Hasta</label>
                    <input type="date" value={statsHasta} onChange={e => setStatsHasta(e.target.value)} className="filtro-cargo-select" />
                  </div>
                  <button
                    className="btn-clear-filtros"
                    onClick={() => { setStatsDesde(thirtyDaysAgoISO()); setStatsHasta(todayISO()); }}
                  >
                    Últimos 30 días
                  </button>
                </div>

                <div className="pastoral-compare-grid">
                  {REDES.map(red => {
                    const st = statsByRed[red.id];
                    return (
                      <div key={red.id} className="pastoral-compare-card" style={{ '--c1': red.color }}>
                        <h3 className="stats-section-title" style={{ color: red.color, borderColor: red.color }}>
                          {red.nombre}
                        </h3>

                        <div className="stats-kpi-row">
                          <div className="stats-kpi">
                            <span className="stats-kpi-num">{st.total}</span>
                            <span className="stats-kpi-label">Total</span>
                          </div>
                          <div className="stats-kpi">
                            <span className="stats-kpi-num" style={{ color: red.color }}>{st.nuevosEnRango}</span>
                            <span className="stats-kpi-label">En el período</span>
                          </div>
                        </div>

                        <div className="pastoral-compare-servicios">
                          {Object.entries(st.asistenciaPorServicio).map(([s, data]) => {
                            const total = data.asistio + data.noAsistio;
                            const pct = total > 0 ? Math.round((data.asistio / total) * 100) : 0;
                            return (
                              <div key={s} className="pastoral-compare-servicio-row">
                                <span>{SERVICIOS_LABEL[s]}</span>
                                <div className="stats-bar-track">
                                  <div className="stats-bar-fill" style={{ width: `${pct}%`, background: red.color }} />
                                </div>
                                <span className="pastoral-compare-pct">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="pastoral-compare-llamadas">
                          <span>Llamadas: <strong>{st.llamadasStats.total}</strong></span>
                          <span className="pastoral-compare-sin">Sin contactar: <strong>{st.sinContactar}</strong></span>
                        </div>

                        {Object.keys(st.metodoCount).length > 0 && (
                          <p className="pastoral-compare-metodo">
                            Método principal: <strong>
                              {Object.entries(st.metodoCount).sort((a, b) => b[1] - a[1])[0][0]}
                            </strong>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PastoralPanel;
