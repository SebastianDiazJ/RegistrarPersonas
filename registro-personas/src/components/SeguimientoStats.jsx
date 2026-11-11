import { useMemo, useState } from 'react';
import { REDES, REDES_MAP } from '../config/redes';
import {
  pct, computePorLlamar, computeResponsablesPendientes, computeNuevosPorMes, computeAsistenciaSemanal, computeIncompletos
} from '../services/insightsService';

// Paneles de seguimiento: cuántas personas hay por llamar, quién las tiene, cómo van las
// llamadas, la asistencia y la llegada de personas nuevas. Los comparten Pastoral y Consolidación.

const C_OK = '#059669';
const C_VENCIDA = '#D97706';
const C_NUNCA = '#DC2626';

const diasTexto = (n) => (n === 0 ? 'hoy' : n === 1 ? '1 día' : `${n} días`);

const Delta = ({ actual, anterior }) => {
  const d = actual - anterior;
  if (d === 0) return <span>igual que el mes anterior</span>;
  return <span style={{ color: d > 0 ? C_OK : C_NUNCA }}>{d > 0 ? '▲' : '▼'} {Math.abs(d)} vs mes anterior</span>;
};

/* ── Barra segmentada: al día / vencidas / sin primera llamada ──────────── */
export const BarraLlamadas = ({ i }) => {
  const t = i.total || 1;
  return (
    <div className="seg-wrap">
      <div className="seg-bar" role="img" aria-label={`${i.alDia} al día, ${i.vencidas} vencidas, ${i.nunca} sin primera llamada`}>
        <span style={{ width: `${(i.alDia / t) * 100}%`, background: C_OK }} />
        <span style={{ width: `${(i.vencidas / t) * 100}%`, background: C_VENCIDA }} />
        <span style={{ width: `${(i.nunca / t) * 100}%`, background: C_NUNCA }} />
      </div>
      <div className="seg-legend">
        <span><i style={{ background: C_OK }} />{i.alDia} al día</span>
        <span><i style={{ background: C_VENCIDA }} />{i.vencidas} vencidas</span>
        <span><i style={{ background: C_NUNCA }} />{i.nunca} sin llamar</span>
      </div>
    </div>
  );
};

/* ── KPIs de seguimiento (fila superior) ────────────────────────────────── */
export const SeguimientoKpis = ({ total }) => {
  const contestacion = pct(total.contestaron30, total.llamadas30);
  const aTiempo = pct(total.primeraATiempo, total.nuevos90);
  return (
    <div className="seg-kpi-row">
      <div className="seg-kpi seg-kpi-hero">
        <span className="seg-kpi-label">Por llamar</span>
        <span className="seg-kpi-num" style={{ color: C_NUNCA }}>{total.porLlamar}</span>
        <span className="seg-kpi-sub">{total.vencidas} con llamada vencida (48 h+) · {total.nunca} sin primera llamada</span>
      </div>
      <div className="seg-kpi">
        <span className="seg-kpi-label">Al día</span>
        <span className="seg-kpi-num" style={{ color: C_OK }}>{total.alDia}</span>
        <span className="seg-kpi-sub">{pct(total.alDia, total.total)}% de las personas</span>
      </div>
      <div className="seg-kpi" title="Nuevos de los últimos 90 días cuya primera llamada fue dentro de los 2 días de su ingreso">
        <span className="seg-kpi-label">Primera llamada a tiempo</span>
        <span className="seg-kpi-num">{total.nuevos90 ? `${aTiempo}%` : '—'}</span>
        <span className="seg-kpi-sub">{total.primeraATiempo} de {total.nuevos90} nuevos (90 días)</span>
      </div>
      <div className="seg-kpi">
        <span className="seg-kpi-label">Nuevos este mes</span>
        <span className="seg-kpi-num">{total.nuevosMes}</span>
        <span className="seg-kpi-sub"><Delta actual={total.nuevosMes} anterior={total.nuevosMesAnterior} /></span>
      </div>
      <div className="seg-kpi">
        <span className="seg-kpi-label">Asistieron (7 días)</span>
        <span className="seg-kpi-num">{total.asistieron7}</span>
        <span className="seg-kpi-sub">{total.asistieron30} en los últimos 30 días</span>
      </div>
      <div className="seg-kpi">
        <span className="seg-kpi-label">Llamadas contestadas</span>
        <span className="seg-kpi-num">{total.llamadas30 ? `${contestacion}%` : '—'}</span>
        <span className="seg-kpi-sub">{total.contestaron30} de {total.llamadas30} llamadas (30 días)</span>
      </div>
    </div>
  );
};

/* ── Tarjetas por red (pestaña Resumen) ─────────────────────────────────── */
export const TarjetasRed = ({ insightsByRed, redesInfo }) => (
  <div className="pastoral-resumen-grid">
    {REDES.map(red => {
      const i = insightsByRed[red.id];
      const lider = redesInfo[red.id]?.liderNombre;
      return (
        <div key={red.id} className="pastoral-red-card" style={{ '--c1': red.color }}>
          <div className="pastoral-red-card-header">
            <span className="pastoral-red-name">{red.nombre}</span>
            <span className="pastoral-red-count" title="Personas en la red">{i.total}</span>
          </div>
          {lider && <p className="pastoral-red-lider">Líder: {lider}</p>}

          <div className="red-por-llamar">
            <span className="red-por-llamar-num" style={{ color: i.porLlamar ? C_NUNCA : C_OK }}>{i.porLlamar}</span>
            <span className="red-por-llamar-label">por llamar</span>
          </div>
          <BarraLlamadas i={i} />

          <div className="pastoral-red-mini-kpis">
            <div><strong>{i.nuevosMes}</strong><span>Nuevos/mes</span></div>
            <div><strong>{i.asistieron7}</strong><span>Asistieron 7 d</span></div>
            <div><strong>{i.llamadas30 ? `${pct(i.contestaron30, i.llamadas30)}%` : '—'}</strong><span>Contestan</span></div>
          </div>
        </div>
      );
    })}
  </div>
);

/* ── Personas por llamar (lista priorizada) ─────────────────────────────── */
export const PorLlamarPanel = ({ rawPersonas }) => {
  const [redFiltro, setRedFiltro] = useState('todas');
  const [verTodas, setVerTodas] = useState(false);

  const lista = useMemo(() => computePorLlamar(rawPersonas, REDES), [rawPersonas]);
  const filtrada = redFiltro === 'todas' ? lista : lista.filter(x => x.red === redFiltro);
  const visibles = verTodas ? filtrada : filtrada.slice(0, 12);

  return (
    <div className="seg-panel">
      <div className="seg-panel-head">
        <div>
          <h3 className="seg-panel-title">Personas por llamar</h3>
          <p className="seg-panel-sub">De la más atrasada a la menos atrasada. «Sin llamar» cuenta los días desde el ingreso.</p>
        </div>
        <select className="filtro-cargo-select seg-select" value={redFiltro} onChange={e => { setRedFiltro(e.target.value); setVerTodas(false); }}>
          <option value="todas">Todas las redes ({lista.length})</option>
          {REDES.map(r => <option key={r.id} value={r.id}>{r.nombre} ({lista.filter(x => x.red === r.id).length})</option>)}
        </select>
      </div>
      {filtrada.length === 0 ? (
        <div className="plist-empty">¡Todo al día! No hay personas por llamar.</div>
      ) : (
        <div className="pg-table-scroll">
          <table className="pg-table">
            <thead><tr><th>Persona</th><th>Red</th><th>A cargo de</th><th>Teléfono</th><th>Situación</th></tr></thead>
            <tbody>
              {visibles.map(x => (
                <tr key={x.id}>
                  <td>{x.nombre}</td>
                  <td><span className="seg-dot" style={{ background: REDES_MAP[x.red].color }} />{REDES_MAP[x.red].nombre}</td>
                  <td>{x.aCargoDe}</td>
                  <td>{x.telefono ? <a className="pg-link" href={`tel:${x.telefono}`}>{x.telefono}</a> : '—'}</td>
                  <td>
                    <span className={`pg-estado ${x.estado === 'nunca' ? 'pg-estado-err' : 'pg-estado-pend'}`}>
                      {x.estado === 'nunca' ? 'Sin llamar' : 'Vencida'}
                    </span>{' '}
                    <span className="seg-muted">{x.estado === 'nunca' ? `${diasTexto(x.dias)} desde el ingreso` : `última llamada hace ${diasTexto(x.dias)}`}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filtrada.length > 12 && (
        <button type="button" className="btn-clear-filtros" onClick={() => setVerTodas(v => !v)}>
          {verTodas ? 'Ver menos' : `Ver las ${filtrada.length} personas`}
        </button>
      )}
    </div>
  );
};

/* ── Responsables con más pendientes ────────────────────────────────────── */
export const ResponsablesPanel = ({ rawPersonas }) => {
  const grupos = useMemo(() => {
    const lista = computePorLlamar(rawPersonas, REDES);
    return computeResponsablesPendientes(lista, rawPersonas, REDES).slice(0, 8);
  }, [rawPersonas]);
  const max = grupos[0]?.porLlamar || 1;

  return (
    <div className="seg-panel">
      <h3 className="seg-panel-title">Responsables con más pendientes</h3>
      <p className="seg-panel-sub">Quién tiene más personas por llamar («a cargo de», por red).</p>
      {grupos.length === 0 ? (
        <div className="plist-empty">Nadie tiene pendientes.</div>
      ) : (
        <div className="seg-ranking">
          {grupos.map(g => (
            <div key={`${g.red}::${g.nombre}`} className="seg-rank-row">
              <span className="seg-rank-name"><span className="seg-dot" style={{ background: REDES_MAP[g.red].color }} />{g.nombre}<small>{REDES_MAP[g.red].nombre}</small></span>
              <div className="seg-rank-track"><div style={{ width: `${(g.porLlamar / max) * 100}%`, background: REDES_MAP[g.red].color }} /></div>
              <span className="seg-rank-val">{g.porLlamar}<small>/{g.total}</small></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Tendencias: nuevos por mes y asistencia por semana ─────────────────── */
export const TendenciasPanel = ({ rawPersonas }) => {
  const meses = useMemo(() => computeNuevosPorMes(rawPersonas, REDES, 6), [rawPersonas]);
  const semanas = useMemo(() => computeAsistenciaSemanal(rawPersonas, REDES, 8), [rawPersonas]);
  const maxMes = Math.max(1, ...meses.map(m => m.total));
  const maxSem = Math.max(1, ...semanas.map(s => s.asistieron + s.faltaron));

  return (
    <div className="seg-two">
      <div className="seg-panel">
        <h3 className="seg-panel-title">Personas nuevas por mes</h3>
        <p className="seg-panel-sub">Últimos 6 meses, por fecha de ingreso.</p>
        <div className="seg-chart" role="img" aria-label="Personas nuevas por mes">
          {meses.map(m => (
            <div key={`${m.anio}-${m.mes}`} className="seg-col">
              <span className="seg-col-val">{m.total}</span>
              <div className="seg-col-stack" style={{ height: `${(m.total / maxMes) * 100}%` }}>
                {REDES.map(r => m.porRed[r.id] ? <span key={r.id} title={`${r.nombre}: ${m.porRed[r.id]}`} style={{ flex: m.porRed[r.id], background: r.color }} /> : null)}
              </div>
              <span className="seg-col-label">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="seg-legend">
          {REDES.map(r => <span key={r.id}><i style={{ background: r.color }} />{r.nombre}</span>)}
        </div>
      </div>

      <div className="seg-panel">
        <h3 className="seg-panel-title">Asistencia por semana</h3>
        <p className="seg-panel-sub">Registros de asistencia de las últimas 8 semanas (semana que inicia el lunes).</p>
        <div className="seg-chart" role="img" aria-label="Asistencia por semana">
          {semanas.map(s => (
            <div key={s.label} className="seg-col">
              <span className="seg-col-val">{s.asistieron}</span>
              <div className="seg-col-stack" style={{ height: `${((s.asistieron + s.faltaron) / maxSem) * 100}%` }}>
                {s.asistieron > 0 && <span title={`Asistieron: ${s.asistieron}`} style={{ flex: s.asistieron, background: C_OK }} />}
                {s.faltaron > 0 && <span title={`No asistieron: ${s.faltaron}`} style={{ flex: s.faltaron, background: '#94A3B8' }} />}
              </div>
              <span className="seg-col-label">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="seg-legend">
          <span><i style={{ background: C_OK }} />Asistieron</span>
          <span><i style={{ background: '#94A3B8' }} />No asistieron</span>
        </div>
      </div>
    </div>
  );
};

/* ── Embudo y llamadas por red (pestaña Comparativas) ───────────────────── */
export const EmbudoPorRed = ({ insightsByRed }) => (
  <div className="pastoral-compare-grid">
    {REDES.map(red => {
      const i = insightsByRed[red.id];
      const pasos = [
        { label: 'Personas en la red', val: i.total, base: i.total },
        { label: 'Con primera llamada', val: i.total - i.nunca, base: i.total },
        { label: 'Asistieron en 30 días', val: i.asistieron30, base: i.total },
        { label: 'Han asistido 2+ veces', val: i.regresaron, base: i.total }
      ];
      const contest = pct(i.contestaron30, i.llamadas30);
      return (
        <div key={red.id} className="pastoral-compare-card" style={{ '--c1': red.color }}>
          <h3 className="stats-section-title" style={{ color: red.color, borderColor: red.color }}>{red.nombre}</h3>
          <div className="embudo">
            {pasos.map(p => (
              <div key={p.label} className="embudo-row">
                <span className="embudo-label">{p.label}</span>
                <div className="embudo-track"><div style={{ width: `${pct(p.val, p.base)}%`, background: red.color }} /></div>
                <span className="embudo-val">{p.val}<small>{pct(p.val, p.base)}%</small></span>
              </div>
            ))}
          </div>
          <div className="seg-minilist">
            <span><strong style={{ color: C_NUNCA }}>{i.porLlamar}</strong> por llamar</span>
            <span><strong>{i.sinAsistir14}</strong> sin asistir 14 d</span>
            <span><strong>{i.riesgo3}</strong> con 3+ ausencias</span>
          </div>
          {i.llamadas30 > 0 && (
            <div className="seg-wrap">
              <div className="seg-bar">
                <span style={{ width: `${pct(i.contestaron30, i.llamadas30)}%`, background: C_OK }} />
                <span style={{ width: `${pct(i.noContestaron30, i.llamadas30)}%`, background: C_VENCIDA }} />
                <span style={{ width: `${pct(i.desinteres30, i.llamadas30)}%`, background: C_NUNCA }} />
              </div>
              <div className="seg-legend">
                <span><i style={{ background: C_OK }} />{i.contestaron30} contestaron ({contest}%)</span>
                <span><i style={{ background: C_VENCIDA }} />{i.noContestaron30} no contestaron</span>
                <span><i style={{ background: C_NUNCA }} />{i.desinteres30} desinterés</span>
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

/* ── Registros con datos incompletos ────────────────────────────────────── */
export const IncompletosPanel = ({ rawPersonas }) => {
  const [ver, setVer] = useState(false);
  const lista = useMemo(() => computeIncompletos(rawPersonas, REDES), [rawPersonas]);
  if (lista.length === 0) return null;
  const visibles = ver ? lista : lista.slice(0, 8);

  return (
    <div className="seg-panel">
      <h3 className="seg-panel-title">Registros con datos incompletos ({lista.length})</h3>
      <p className="seg-panel-sub">
        Personas a las que les falta algún dato obligatorio. Complétalas o elimínalas desde «Ver personas» (o «Personas por red» en Pastoral).
      </p>
      <div className="pg-table-scroll">
        <table className="pg-table">
          <thead><tr><th>Persona</th><th>Red</th><th>Falta</th></tr></thead>
          <tbody>
            {visibles.map(x => (
              <tr key={x.id}>
                <td>{x.nombre}</td>
                <td><span className="seg-dot" style={{ background: REDES_MAP[x.red].color }} />{REDES_MAP[x.red].nombre}</td>
                <td className="seg-muted">{x.faltan.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista.length > 8 && (
        <button type="button" className="btn-clear-filtros" onClick={() => setVer(v => !v)}>
          {ver ? 'Ver menos' : `Ver las ${lista.length} personas`}
        </button>
      )}
    </div>
  );
};
