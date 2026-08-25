const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const SERVICIOS = ['sabado', 'domingo', 'miercoles'];

export const computeRedStats = (personas) => {
  const now = new Date();
  const cutoff = thirtyDaysAgo();

  // Nuevos este mes
  const nuevosEsteMes = personas.filter(p => {
    if (!p.fechaIngreso) return false;
    const d = new Date(p.fechaIngreso);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Últimos 30 días
  const nuevosUltimos30 = personas.filter(p => {
    if (!p.fechaIngreso) return false;
    return new Date(p.fechaIngreso) >= cutoff;
  }).length;

  // Asistencia por servicio (últimos 30 días)
  const asistenciaPorServicio = {};
  SERVICIOS.forEach(s => { asistenciaPorServicio[s] = { asistio: 0, noAsistio: 0 }; });

  personas.forEach(p => {
    (p.asistencias || []).forEach(a => {
      if (!SERVICIOS.includes(a.servicio)) return;
      if (new Date(a.fecha) < cutoff) return;
      if (a.asistio) asistenciaPorServicio[a.servicio].asistio++;
      else asistenciaPorServicio[a.servicio].noAsistio++;
    });
  });

  // Llamadas stats (total histórico)
  const llamadasStats = { total: 0, contesto: 0, no_contesto: 0, desinteres: 0 };
  personas.forEach(p => {
    (p.llamadas || []).forEach(l => {
      llamadasStats.total++;
      if (llamadasStats[l.resultado] !== undefined) llamadasStats[l.resultado]++;
    });
  });

  // Personas sin contactar nunca
  const sinContactar = personas.filter(p => !p.lastCallDate).length;

  // Inasistencias (personas con 3+ ausencias legacy O con mas de 40% no-asistencias en historial)
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
    nuevosUltimos30,
    asistenciaPorServicio,
    llamadasStats,
    sinContactar,
    inasistentesLegacy,
    metodoCount
  };
};
