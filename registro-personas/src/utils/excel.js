import writeExcelFile from 'write-excel-file/universal';
import { safeCell } from './validacion';
import { MESES } from '../config/opciones';
import { REDES_MAP } from '../config/redes';

const COLUMNAS = [
  { titulo: 'Cédula',          ancho: 14, valor: p => p.cedula },
  { titulo: 'Apellido',        ancho: 20, valor: p => p.apellido },
  { titulo: 'Nombre',          ancho: 20, valor: p => p.nombre },
  { titulo: 'Teléfono',        ancho: 14, valor: p => p.telefono },
  { titulo: 'Correo',          ancho: 28, valor: p => p.email },
  { titulo: 'Cumpleaños',      ancho: 16, valor: p => (p.mesCumple && p.diaCumple ? `${p.diaCumple} de ${MESES[Number(p.mesCumple) - 1] || ''}` : '') },
  { titulo: 'Estado civil',    ancho: 14, valor: p => p.estadoCivil },
  { titulo: 'Cédula pareja',   ancho: 14, valor: p => p.parejaCedula },
  { titulo: 'Asiste',          ancho: 8,  valor: p => (p.asiste ? 'Sí' : 'No') },
  { titulo: 'Red',             ancho: 12, valor: p => (p.redAsignada ? REDES_MAP[p.redAsignada]?.nombre || p.redAsignada : '') },
  { titulo: 'A cargo de',      ancho: 22, valor: p => p.aCargoDe },
  { titulo: 'Método de invitación', ancho: 18, valor: p => p.metodoInvitacion },
  { titulo: 'Fecha de ingreso', ancho: 14, valor: p => p.fechaIngreso },
  { titulo: 'Petición de oración', ancho: 40, valor: p => p.prayerRequest },
  { titulo: 'Registrado por',  ancho: 20, valor: p => p.creadoPor }
];

// Genera y descarga un .xlsx. Las celdas de texto se neutralizan contra inyección de fórmulas.
export const exportarPersonasExcel = async (personas, nombreArchivo = 'personas') => {
  const encabezado = COLUMNAS.map(c => ({ value: c.titulo, fontWeight: 'bold' }));
  const filas = personas.map(p => COLUMNAS.map(c => {
    const v = c.valor(p);
    return v ? { type: String, value: safeCell(v) } : null;
  }));
  const blob = await writeExcelFile([encabezado, ...filas], {
    columns: COLUMNAS.map(c => ({ width: c.ancho })),
    sheet: 'Personas'
  }).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
