import { auth } from '../config/firebase';

// Dispara el envío INMEDIATO de los correos de una persona recién registrada (aviso al líder de
// la red y bienvenida a la persona) llamando a la función de Vercel /api/avisar con la sesión de
// quien registra. Si no responde (sin conexión, función sin configurar o modo local), el envío
// programado de GitHub lo hace unos minutos después, sin duplicar nada.
export const avisarNuevaPersona = async (red, id) => {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 25000);
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return { success: false, motivo: 'sin_sesion' };
    const r = await fetch('/api/avisar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ red, id }),
      signal: controlador.signal
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) return { success: false, motivo: data.error || `http_${r.status}` };
    return { success: true, lider: data.lider, persona: data.persona };
  } catch {
    return { success: false, motivo: 'red' };
  } finally {
    clearTimeout(limite);
  }
};

const TEXTO_LIDER = {
  enviado: 'Aviso enviado por correo al líder.',
  simulado: 'Aviso (simulado) al líder.',
  sin_correo: 'El líder de esta red no tiene correo registrado (Pastoral → Líderes y contacto).',
  omitido: 'El aviso al líder ya se había enviado.',
  error: 'No se pudo enviar el aviso al líder; se reintentará automáticamente.'
};
const TEXTO_PERSONA = {
  enviado: 'Bienvenida enviada a la persona.',
  simulado: 'Bienvenida (simulada) a la persona.',
  sin_correo: '',
  baja: 'La persona canceló sus correos: no se le envía bienvenida.',
  omitido: '',
  error: 'No se pudo enviar la bienvenida; se reintentará automáticamente.'
};

export const textoAviso = (r) => {
  if (!r.success) return 'El aviso por correo se enviará automáticamente en unos minutos.';
  return [TEXTO_LIDER[r.lider], TEXTO_PERSONA[r.persona]].filter(Boolean).join(' ');
};
