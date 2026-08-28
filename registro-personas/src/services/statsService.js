const SERVICIOS = ['sabado', 'domingo', 'miercoles'];

export const computeRedStats = (personas, { desde, hasta } = {}) => {
  const now = new Date();

  // Rango de fechas
  const cutoffFrom = desde
    ? new Date(desde)
    : new Date(now - 30 * 24 * 60 * 60 * 1000);
  const cutoffTo = hasta
    ? new Date(hasta + 'T23:59:59')
    : now;

  // Nuevos en el rango
  const nuevosEnRango = personas.filter(p => {
    if (!p.fechaIngreso) return false;
    const d = new Date(p.fechaIngreso);
    return d >= cutoffFrom && d <= cutoffTo;
  }).length;

  // Nuevos este mes
  const nuevosEsteMes = personas.filter(p => {
    if (!p.fechaIngreso) return false;
    const d = new Date(p.fechaIngreso);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Asistencia por servicio en el rango
  const asistenciaPorServicio = {};
  SERVICIOS.forEach(s => { asistenciaPorServicio[s] = { asistio: 0, noAsistio: 0 }; });

  personas.forEach(p => {
    (p.asistencias || []).forEach(a => {
      if (!SERVICIOS.includes(a.servicio)) return;
      const d = new Date(a.fecha);
      if (d < cutoffFrom || d > cutoffTo) return;
      if (a.asistio) asistenciaPorServicio[a.servicio].asistio++;
      else asistenciaPorServicio[a.servicio].noAsistio++;
    });
  });

  // Llamadas stats (histórico completo)
  const llamadasStats = { total: 0, contesto: 0, no_contesto: 0, desinteres: 0 };
  personas.forEach(p => {
    (p.llamadas || []).forEach(l => {
      llamadasStats.total++;
      if (llamadasStats[l.resultado] !== undefined) llamadasStats[l.resultado]++;
    });
  });

  const sinContactar = personas.filter(p => !p.lastCallDate).length;
  const inasistentesLegacy = personas.filter(p => (p.ausencias || 0) >= 3).length;

  // Método de invitación
  const metodoCount = {};
  personas.forEach(p => {
    const m = p.metodoInvitacion || 'Sin registrar';
    metodoCount[m] = (metodoCount[m] || 0) + 1;
  });

  return {
    total: personas.length,
    nuevosEsteMes,
    nuevosEnRango,
    asistenciaPorServicio,
    llamadasStats,
    sinContactar,
    inasistentesLegacy,
    metodoCount,
    rangoDesde: cutoffFrom.toISOString().split('T')[0],
    rangoHasta: cutoffTo.toISOString().split('T')[0]
  };
};

// Agrupa las personas de una red por el campo "aCargoDe" (responsable interno)
export const computeLeaderBreakdown = (personas) => {
  const groups = {};
  personas.forEach(p => {
    const key = (p.aCargoDe || '').trim() || 'Sin asignar';
    if (!groups[key]) groups[key] = { nombre: key, total: 0, contactados: 0, pendientes: 0 };
    groups[key].total++;
    if (p.lastCallDate) groups[key].contactados++;
    else groups[key].pendientes++;
  });
  return Object.values(groups).sort((a, b) => b.total - a.total);
};
