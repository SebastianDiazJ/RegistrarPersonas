// Filtros de entrada: se aplican mientras se escribe para que solo entren caracteres válidos.
export const onlyLetters = (v) => (v || '').replace(/[^\p{L}\s]/gu, '');
export const onlyDigits = (v) => (v || '').replace(/\D/g, '');

// ── Saneamiento y validación (espejo de las reglas de Firestore) ──────────
// Caracteres de control, ancho cero y marcas bidireccionales: no tienen uso
// legítimo en estos campos y sirven para ocultar contenido o falsificar texto.
// eslint-disable-next-line no-control-regex
const INVISIBLES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

// Texto libre (petición de oración, etc.): sin etiquetas ni invisibles, espacios colapsados.
export const sanitizeText = (v, max = 500) =>
  String(v ?? '')
    .normalize('NFC')
    .replace(INVISIBLES, '')
    .replace(/[<>]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);

// Nombres propios: solo letras y espacios.
export const sanitizeName = (v, max = 60) =>
  onlyLetters(sanitizeText(v, max)).replace(/\s+/g, ' ').trim();

export const sanitizeEmail = (v) => sanitizeText(v, 100).replace(/\s/g, '').toLowerCase();

// Evita que Excel/Sheets interpreten una celda como fórmula (CSV/formula injection).
export const safeCell = (v) => {
  const s = String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

export const isValidCedula = (v) => /^\d{5,12}$/.test(v || '');
export const isValidTelefono = (v) => !v || /^\d{7,15}$/.test(v);
export const isValidEmail = (v) => !v || /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]{2,}$/.test(v);
export const isValidFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v));

// Campos obligatorios al registrar una persona en una red (Consolidación y formulario de red).
// Opcionales: correo, edad, petición de oración y los datos de la llamada inicial.
export const validarPersonaRed = (f) => {
  const errors = {};
  if (!sanitizeName(f.nombre)) errors.nombre = 'Escribe el nombre.';
  if (!sanitizeName(f.apellido)) errors.apellido = 'Escribe el apellido.';
  if (!/^\d{7,15}$/.test(onlyDigits(f.telefono))) errors.telefono = 'Teléfono de 7 a 15 dígitos.';
  const email = sanitizeEmail(f.email);
  if (email && !isValidEmail(email)) errors.email = 'El correo no es válido.';
  if (f.edad !== undefined && f.edad !== '' && !(Number(f.edad) >= 1 && Number(f.edad) <= 120)) errors.edad = 'Edad entre 1 y 120.';
  if (!isValidFecha(f.fechaIngreso)) errors.fechaIngreso = 'Elige la fecha de ingreso.';
  if (!f.metodoInvitacion) errors.metodoInvitacion = 'Elige cómo llegó.';
  if (!sanitizeName(f.aCargoDe)) errors.aCargoDe = 'Elige el líder a cargo.';
  if (!f.mesCumple || !f.diaCumple) errors.cumple = 'Elige mes y día del cumpleaños.';
  return errors;
};
