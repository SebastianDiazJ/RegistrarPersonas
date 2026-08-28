export const REDES = [
  { id: 'xtreme',  nombre: 'XTREME',  color: '#4338CA' },
  { id: 'parejas', nombre: 'PAREJAS', color: '#BE185D' },
  { id: '360',     nombre: '360',     color: '#0369A1' },
  { id: 'senior',  nombre: 'SENIOR',  color: '#B45309' }
];

export const REDES_MAP = REDES.reduce((acc, r) => ({ ...acc, [r.id]: r }), {});
