import { useState, useEffect, useMemo } from 'react';
import { REDES } from '../config/redes';
import { getAllPersons } from '../services/personService';
import { getAllRedesInfo, updateRedLeaderInfo } from '../services/redService';
import { computeRedStats, computeLeaderBreakdown } from '../services/statsService';
import { getCallAlertSummary } from '../services/callAlertService';
import { computeInsights, sumInsights } from '../services/insightsService';
import { SeguimientoKpis, TarjetasRed, PorLlamarPanel, ResponsablesPanel, TendenciasPanel, EmbudoPorRed, IncompletosPanel } from './SeguimientoStats';
import { sanitizeEmail, sanitizeName, isValidEmail, onlyDigits } from '../utils/validacion';

// Vista global de todas las redes (resumen, líderes y contacto, estadísticas
// comparativas). La comparten los módulos Pastoral y Consolidación.

const SERVICIOS_LABEL = { sabado: 'Sábado', domingo: 'Domingo', miercoles: 'Miércoles' };

const todayISO = () => new Date().toISOString().split('T')[0];
const thirtyDaysAgoISO = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

/* ── Datos: personas y datos de contacto de todas las redes ─────────────── */
export const useVistaGlobal = () => {
  const [rawPersonas, setRawPersonas] = useState({});
  const [redesInfo, setRedesInfo] = useState({});
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const statsByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => { map[r.id] = computeRedStats(rawPersonas[r.id] || []); });
    return map;
  }, [rawPersonas]);

  const callSummaryByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => { map[r.id] = getCallAlertSummary(rawPersonas[r.id] || []); });
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

  const insightsByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => { map[r.id] = computeInsights(rawPersonas[r.id] || []); });
    return map;
  }, [rawPersonas]);

  const insightsTotal = useMemo(() => sumInsights(Object.values(insightsByRed)), [insightsByRed]);

  const updateRedInfo = (redId, draft) => setRedesInfo(prev => ({ ...prev, [redId]: { ...prev[redId], ...draft } }));

  return {
    rawPersonas, redesInfo, loading, reload: loadAll,
    statsByRed, callSummaryByRed, globalTotals, insightsByRed, insightsTotal, updateRedInfo
  };
};

/* ── KPIs globales ──────────────────────────────────────────────────────── */
export const GlobalKpis = ({ rawPersonas, globalTotals, insightsTotal, mostrarTotales = true }) => (
  <>
    {mostrarTotales && <div className="consol-stats-row">
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
    </div>}

    <SeguimientoKpis total={insightsTotal} />
  </>
);

/* ── Resumen general ────────────────────────────────────────────────────── */
export const ResumenTab = ({ redesInfo, insightsByRed, rawPersonas }) => (
  <>
    <TarjetasRed insightsByRed={insightsByRed} redesInfo={redesInfo} />
    <PorLlamarPanel rawPersonas={rawPersonas} />
    <ResponsablesPanel rawPersonas={rawPersonas} />
    <IncompletosPanel rawPersonas={rawPersonas} />
  </>
);

/* ── Líderes y contacto ─────────────────────────────────────────────────── */
export const LideresTab = ({ rawPersonas, redesInfo, onSaved }) => {
  const [leaderDrafts, setLeaderDrafts] = useState(() => {
    const drafts = {};
    REDES.forEach(r => {
      drafts[r.id] = {
        liderNombre: redesInfo[r.id]?.liderNombre || '',
        whatsapp: redesInfo[r.id]?.whatsapp || '',
        liderEmail: redesInfo[r.id]?.liderEmail || ''
      };
    });
    return drafts;
  });
  const [savingRed, setSavingRed] = useState(null);
  const [savedFeedback, setSavedFeedback] = useState(null);
  const [expandedBreakdown, setExpandedBreakdown] = useState(null); // `${redId}::${nombre}`

  const leaderBreakdownByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => { map[r.id] = computeLeaderBreakdown(rawPersonas[r.id] || []); });
    return map;
  }, [rawPersonas]);

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

  // Lo guardado hoy (ya saneado) y lo que el usuario cambió de verdad. Solo se envían los cambios:
  // así un campo en blanco por una lectura fallida o por una pantalla vieja no borra datos.
  const guardado = (redId) => ({
    liderNombre: sanitizeName(redesInfo[redId]?.liderNombre || '', 80),
    whatsapp: onlyDigits(redesInfo[redId]?.whatsapp || '').slice(0, 20),
    liderEmail: sanitizeEmail(redesInfo[redId]?.liderEmail || '')
  });
  const limpio = (d) => ({
    liderNombre: sanitizeName(d.liderNombre || '', 80),
    whatsapp: onlyDigits(d.whatsapp || '').slice(0, 20),
    liderEmail: sanitizeEmail(d.liderEmail || '')
  });
  const cambiosDe = (redId) => {
    const orig = guardado(redId);
    const nuevo = limpio(leaderDrafts[redId] || {});
    const cambios = {};
    Object.keys(nuevo).forEach(k => { if (nuevo[k] !== orig[k]) cambios[k] = nuevo[k]; });
    return cambios;
  };
  const sucias = REDES.filter(r => !redesInfo[r.id]?.__error && Object.keys(cambiosDe(r.id)).length > 0);

  // Avisa si se intenta cerrar la página con correos o contactos sin guardar.
  useEffect(() => {
    if (sucias.length === 0) return undefined;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [sucias.length]);

  const guardarRed = async (redId) => {
    const cambios = cambiosDe(redId);
    if (Object.keys(cambios).length === 0) return { ok: true, sinCambios: true };
    if (cambios.liderEmail && !isValidEmail(cambios.liderEmail)) return { ok: false, msg: 'El correo del líder no es válido.' };
    const result = await updateRedLeaderInfo(redId, cambios);
    if (!result.success) return { ok: false, msg: result.error };
    onSaved(redId, cambios);
    return { ok: true };
  };

  const handleSaveLeader = async (redId) => {
    setSavingRed(redId);
    setSavedFeedback(null);
    const r = await guardarRed(redId);
    setSavedFeedback({ redId, ...r });
    setSavingRed(null);
  };

  const handleSaveAll = async () => {
    setSavingRed('todas');
    setSavedFeedback(null);
    for (const red of sucias) {
      const r = await guardarRed(red.id);
      if (!r.ok) { setSavedFeedback({ redId: red.id, ...r }); break; }
    }
    setSavingRed(null);
  };

  return (
    <>
    {sucias.length > 0 && (
      <div className="seg-unsaved">
        <span>Tienes cambios sin guardar en {sucias.length === 1 ? '1 red' : `${sucias.length} redes`}: {sucias.map(r => r.nombre).join(', ')}.</span>
        <button type="button" className="btn-submit" style={{ background: '#1B2D45' }} disabled={savingRed !== null} onClick={handleSaveAll}>
          {savingRed === 'todas' ? 'Guardando...' : 'Guardar todos los cambios'}
        </button>
      </div>
    )}
    <div className="pastoral-lideres-grid">
      {REDES.map(red => {
        const draft = leaderDrafts[red.id] || { liderNombre: '', whatsapp: '', liderEmail: '' };
        const sinCargar = Boolean(redesInfo[red.id]?.__error);
        const sinGuardar = !sinCargar && Object.keys(cambiosDe(red.id)).length > 0;
        const breakdown = leaderBreakdownByRed[red.id] || [];
        const feedback = savedFeedback && savedFeedback.redId === red.id ? savedFeedback : null;
        return (
          <div key={red.id} className="pastoral-lider-card" style={{ '--c1': red.color }}>
            <div className="pastoral-red-card-header">
              <span className="pastoral-red-name">{red.nombre}</span>
              {sinGuardar && <span className="pg-estado pg-estado-pend">Sin guardar</span>}
              <span className="pastoral-red-count">{(rawPersonas[red.id] || []).length}</span>
            </div>
            {sinCargar && (
              <div className="login-error">No se pudieron cargar los datos de esta red. Recarga la página antes de editarlos para no borrar nada por error.</div>
            )}

            <div className="form-group">
              <label>Nombre del líder de red</label>
              <input
                value={draft.liderNombre}
                onChange={handleDraftChange(red.id, 'liderNombre')}
                placeholder="Nombre del líder"
                maxLength={80}
                name={`lider-nombre-${red.id}`}
                autoComplete="off"
                disabled={sinCargar}
              />
            </div>
            <div className="form-group">
              <label>WhatsApp del líder</label>
              <input
                value={draft.whatsapp}
                onChange={handleDraftChange(red.id, 'whatsapp')}
                placeholder="Ej: 573001234567"
                type="tel"
                maxLength={20}
                name={`lider-whatsapp-${red.id}`}
                autoComplete="off"
                disabled={sinCargar}
              />
            </div>
            <div className="form-group">
              <label>Correo del líder (avisos de personas nuevas)</label>
              <input
                value={draft.liderEmail}
                onChange={handleDraftChange(red.id, 'liderEmail')}
                placeholder="lider@correo.com"
                type="email"
                maxLength={100}
                name={`lider-correo-${red.id}`}
                autoComplete="off"
                disabled={sinCargar}
              />
            </div>

            {feedback && (
              <div className={feedback.ok ? 'consol-feedback-ok' : 'login-error'}>
                {feedback.ok ? (feedback.sinCambios ? 'No hay cambios por guardar' : 'Datos guardados') : feedback.msg}
              </div>
            )}

            <button
              className="btn-submit"
              style={{ background: red.color }}
              disabled={savingRed !== null || sinCargar}
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
    </>
  );
};

/* ── Estadísticas comparativas ──────────────────────────────────────────── */
export const ComparativasTab = ({ rawPersonas }) => {
  const [statsDesde, setStatsDesde] = useState(thirtyDaysAgoISO());
  const [statsHasta, setStatsHasta] = useState(todayISO());

  const statsByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => {
      map[r.id] = computeRedStats(rawPersonas[r.id] || [], { desde: statsDesde, hasta: statsHasta });
    });
    return map;
  }, [rawPersonas, statsDesde, statsHasta]);

  const insightsByRed = useMemo(() => {
    const map = {};
    REDES.forEach(r => { map[r.id] = computeInsights(rawPersonas[r.id] || []); });
    return map;
  }, [rawPersonas]);

  return (
    <div className="consol-stats-detail">
      <TendenciasPanel rawPersonas={rawPersonas} />

      <h3 className="seg-section-title">Seguimiento por red</h3>
      <EmbudoPorRed insightsByRed={insightsByRed} />

      <h3 className="seg-section-title">Detalle por período</h3>
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
  );
};

/* ── Pestaña autónoma (para módulos que no mantienen el estado global) ──── */
export const VistaGlobalTab = ({ tab }) => {
  const { rawPersonas, redesInfo, loading, globalTotals, insightsByRed, insightsTotal, updateRedInfo } = useVistaGlobal();
  if (loading) return <div className="loading">Cargando información de todas las redes...</div>;
  return (
    <>
      {/* Consolidación ya muestra los totales por red arriba de sus pestañas */}
      <GlobalKpis rawPersonas={rawPersonas} globalTotals={globalTotals} insightsTotal={insightsTotal} mostrarTotales={false} />
      {tab === 'resumen' && <ResumenTab redesInfo={redesInfo} insightsByRed={insightsByRed} rawPersonas={rawPersonas} />}
      {tab === 'lideres' && <LideresTab rawPersonas={rawPersonas} redesInfo={redesInfo} onSaved={updateRedInfo} />}
      {tab === 'comparativas' && <ComparativasTab rawPersonas={rawPersonas} />}
    </>
  );
};
