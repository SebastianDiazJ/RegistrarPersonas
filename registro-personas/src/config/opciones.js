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

export const ESTADOS_CIVILES = [
  { id: 'soltero',     label: 'Soltero(a)' },
  { id: 'casado',      label: 'Casado(a)' },
  { id: 'union_libre', label: 'Unión libre' },
  { id: 'viudo',       label: 'Viudo(a)' },
  { id: 'separado',    label: 'Separado(a)' }
];

// Texto de autorización (Ley 1581 de 2012 y Decreto 1377 de 2013, Colombia).
export const HABEAS_DATA_TEXTO =
  'Autorizo de manera libre, previa, expresa e informada el tratamiento de mis datos personales ' +
  '(nombre, cédula, teléfono, correo, fecha de cumpleaños, estado civil y petición de oración) por parte de la iglesia, ' +
  'con la finalidad de registrarme, contactarme, hacerme seguimiento pastoral y asignarme a una red de la iglesia. ' +
  'Sé que son datos personales cuyo tratamiento es voluntario, que no serán vendidos ni compartidos con terceros ajenos a la iglesia, ' +
  'y que puedo conocer, actualizar, rectificar o solicitar la supresión de mis datos, o revocar esta autorización, ' +
  'en cualquier momento comunicándome con el equipo pastoral.';
