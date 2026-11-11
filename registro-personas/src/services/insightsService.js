import { getCallAlertStatus } from './callAlertService';

// Estadísticas de seguimiento para los paneles Resumen y Comparativas.
// "Por llamar" = personas nunca llamadas + personas cuya última llamada ya venció (48 h o más).

const DIA_MS = 24 * 60 * 60 * 1000;

const parseDia = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00`) : null);
const ingresoDe = (p) => parseDia(p.fechaIngreso) || (p.createdAt ? new Date(p.createdAt) : null);
const fechasAsistio = (p) => (p.asistencias || []).filter(a => a.asistio && a.fecha).map(a => parseDia(a.fecha));
const diasEntre = (a, b) => Math.floor((b - a) / DIA_MS);

const primeraLlamada = (p) => {
  const fechas = (p.llamadas || []).map(l => l.ts && new Date(l.ts)).filter(Boolean);
  if (fechas.length) return new Date(Math.min(...fechas));
  return p.lastCallDate ? new Date(p.lastCallDate) : null;
};

export const INSIGHTS_VACIO = {
  total: 0, alDia: 0, vencidas: 0, nunca: 0, porLlamar: 0,
  nuevosMes: 0, nuevosMesAnterior: 0,
  nuevos90: 0, primeraATiempo: 0,
  asistieron7: 0, asistieron30: 0, regresaron: 0, sinAsistir14: 0, riesgo3: 0,
  llamadas30: 0, contestaron30: 0, noContestaron30: 0, desinteres30: 0
};

export const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

// Cifras de seguimiento de un grupo de personas (una red o el total).
export const computeInsights = (personas, ahora = new Date()) => {
  const r = { ...INSIGHTS_VACIO, total: personas.length };
  const hace7 = new Date(ahora - 7 * DIA_MS);
  const hace14 = new Date(ahora - 14 * DIA_MS);
  const hace30 = new Date(ahora - 30 * DIA_MS);
  const hace90 = new Date(ahora - 90 * DIA_MS);
  const iniMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const iniMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

  personas.forEach(p => {
    if (!p.lastCallDate) r.nunca++;
    else if (getCallAlertStatus(p).isAlert) r.vencidas++;
    else r.alDia++;

    const ingreso = ingresoDe(p);
    if (ingreso) {
      if (ingreso >= iniMes) r.nuevosMes++;
      else if (ingreso >= iniMesAnt) r.nuevosMesAnterior++;
      if (ingreso >= hace90) {
        r.nuevos90++;
        const pl = primeraLlamada(p);
        if (pl && diasEntre(ingreso, pl) <= 2) r.primeraATiempo++;
      }
    }

    const asist = fechasAsistio(p);
    if (asist.some(f => f >= hace7)) r.asistieron7++;
    if (asist.some(f => f >= hace30)) r.asistieron30++;
    if (new Set(asist.map(f => f.getTime())).size >= 2) r.regresaron++;
    if (ingreso && ingreso <= hace14 && !asist.some(f => f >= hace14)) r.sinAsistir14++;
    if ((p.ausencias || 0) >= 3) r.riesgo3++;

    (p.llamadas || []).forEach(l => {
      if (!l.ts || new Date(l.ts) < hace30) return;
      r.llamadas30++;
      if (l.resultado === 'contesto') r.contestaron30++;
      else if (l.resultado === 'no_contesto') r.noContestaron30++;
      else if (l.resultado === 'desinteres') r.desinteres30++;
    });
  });

  r.porLlamar = r.vencidas + r.nunca;
  return r;
};

export const sumInsights = (lista) =>
  lista.reduce((acc, i) => {
    Object.keys(INSIGHTS_VACIO).forEach(k => { acc[k] += i[k] || 0; });
    return acc;
  }, { ...INSIGHTS_VACIO });

// Personas que hay que llamar, de la más atrasada a la menos atrasada.
export const computePorLlamar = (rawPersonas, redes, ahora = new Date()) => {
  const lista = [];
  redes.forEach(red => {
    (rawPersonas[red.id] || []).forEach(p => {
      let estado, dias;
      if (!p.lastCallDate) {
        estado = 'nunca';
        const ing = ingresoDe(p);
        dias = ing ? Math.max(0, diasEntre(ing, ahora)) : 0;
      } else if (getCallAlertStatus(p).isAlert) {
        estado = 'vencida';
        dias = Math.max(0, diasEntre(new Date(p.lastCallDate), ahora));
      } else return;
      lista.push({
        id: `${red.id}-${p.id}`, red: red.id,
        nombre: `${p.nombre || ''} ${p.apellido || ''}`.trim() || '(sin nombre)',
        telefono: p.telefono || '', aCargoDe: (p.aCargoDe || '').trim() || 'Sin asignar',
        estado, dias
      });
    });
  });
  return lista.sort((a, b) => b.dias - a.dias);
};

// Responsables (a cargo de) con más personas por llamar, en todas las redes.
export const computeResponsablesPendientes = (porLlamar, rawPersonas, redes) => {
  const grupos = {};
  redes.forEach(red => {
    (rawPersonas[red.id] || []).forEach(p => {
      const nombre = (p.aCargoDe || '').trim() || 'Sin asignar';
      grupos[`${red.id}::${nombre}`] ??= { red: red.id, nombre, total: 0, porLlamar: 0 };
      grupos[`${red.id}::${nombre}`].total++;
    });
  });
  porLlamar.forEach(x => { grupos[`${x.red}::${x.aCargoDe}`].porLlamar++; });
  return Object.values(grupos).filter(g => g.porLlamar > 0).sort((a, b) => b.porLlamar - a.porLlamar);
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Personas nuevas por mes y red (últimos `meses` meses, el actual incluido).
export const computeNuevosPorMes = (rawPersonas, redes, meses = 6, ahora = new Date()) => {
  const out = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    out.push({ anio: d.getFullYear(), mes: d.getMonth(), label: MESES_CORTOS[d.getMonth()], porRed: {}, total: 0 });
  }
  redes.forEach(red => {
    (rawPersonas[red.id] || []).forEach(p => {
      const ing = ingresoDe(p);
      if (!ing) return;
      const bucket = out.find(b => b.anio === ing.getFullYear() && b.mes === ing.getMonth());
      if (!bucket) return;
      bucket.porRed[red.id] = (bucket.porRed[red.id] || 0) + 1;
      bucket.total++;
    });
  });
  return out;
};

const lunesDe = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

// Asistencias registradas por semana (lunes a domingo), últimas `semanas` semanas.
export const computeAsistenciaSemanal = (rawPersonas, redes, semanas = 8, ahora = new Date()) => {
  const lunesActual = lunesDe(ahora);
  const out = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const ini = new Date(lunesActual);
    ini.setDate(ini.getDate() - i * 7);
    out.push({ ini, label: `${String(ini.getDate()).padStart(2, '0')}/${String(ini.getMonth() + 1).padStart(2, '0')}`, asistieron: 0, faltaron: 0 });
  }
  redes.forEach(red => {
    (rawPersonas[red.id] || []).forEach(p => {
      (p.asistencias || []).forEach(a => {
        const f = parseDia(a.fecha);
        if (!f) return;
        const sem = out.find(w => f >= w.ini && f < new Date(w.ini.getTime() + 7 * DIA_MS));
        if (!sem) return;
        if (a.asistio) sem.asistieron++; else sem.faltaron++;
      });
    });
  });
  return out;
};

// Personas con datos obligatorios vacíos (registros hechos antes de exigirlos o desde versiones viejas).
export const computeIncompletos = (rawPersonas, redes) => {
  const lista = [];
  redes.forEach(red => {
    (rawPersonas[red.id] || []).forEach(p => {
      const faltan = [];
      if (!String(p.nombre || '').trim()) faltan.push('nombre');
      if (!String(p.apellido || '').trim()) faltan.push('apellido');
      if (!/^\d{7,15}$/.test(String(p.telefono || ''))) faltan.push('teléfono');
      if (!String(p.aCargoDe || '').trim()) faltan.push('a cargo de');
      if (!p.metodoInvitacion) faltan.push('método de invitación');
      if (!p.mesCumple || !p.diaCumple) faltan.push('cumpleaños');
      if (!p.fechaIngreso) faltan.push('fecha de ingreso');
      if (faltan.length) {
        lista.push({
          id: `${red.id}-${p.id}`, red: red.id,
          nombre: `${p.nombre || ''} ${p.apellido || ''}`.trim() || '(sin nombre)',
          faltan
        });
      }
    });
  });
  return lista.sort((a, b) => b.faltan.length - a.faltan.length);
};
