export const METODOS_INVITACION = [
  'Publicidad', 'Evangelismo', 'Familiar', 'Amigo', 'Redes sociales', 'Otro'
];

// "Volante" se reemplazó por "Evangelismo"; los registros viejos se muestran como Evangelismo.
export const normalizeMetodo = (m) => (m === 'Volante' ? 'Evangelismo' : m || '');

export const RESULTADOS_LLAMADA = [
  { id: 'contesto',    label: 'Contestó',    cls: 'call-contesto' },
  { id: 'no_contesto', label: 'No contestó', cls: 'call-no-contesto' },
  { id: 'desinteres',  label: 'Desinterés',  cls: 'call-desinteres' }
];

export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export const diasPorMes = (mes) => {
  const dias30 = [4, 6, 9, 11];
  if (mes === 2) return 29;
  if (dias30.includes(mes)) return 30;
  return 31;
};
