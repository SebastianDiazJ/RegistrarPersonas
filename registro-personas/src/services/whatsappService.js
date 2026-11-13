export const cleanPhone = (phone) => (phone || '').replace(/\D/g, '');

export const buildWhatsAppLink = (phone, message) => {
  const clean = cleanPhone(phone);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
};

// Enlace "mailto:" para avisar al líder desde el correo del propio usuario (inmediato, sin servidor).
export const buildMailtoLink = (email, asunto, mensaje) => {
  const limpio = String(email || '').trim().toLowerCase();
  if (!/^[^@\s<>"']+@[^@\s<>"']+\.[^@\s<>"']{2,}$/.test(limpio)) return null;
  return `mailto:${limpio}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
};

export const buildNewPersonMessage = (redNombre, persona) => {
  const nombre = `${persona.nombre || ''} ${persona.apellido || ''}`.trim();
  const tel = persona.telefono ? ` Telefono: ${persona.telefono}.` : '';
  return `Hola, hoy llego una persona nueva a la red ${redNombre}: ${nombre}.${tel} Contactala.`;
};
