export const cleanPhone = (phone) => (phone || '').replace(/\D/g, '');

export const buildWhatsAppLink = (phone, message) => {
  const clean = cleanPhone(phone);
  if (!clean) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
};

export const buildNewPersonMessage = (redNombre, persona) => {
  const nombre = `${persona.nombre || ''} ${persona.apellido || ''}`.trim();
  const tel = persona.telefono ? ` Telefono: ${persona.telefono}.` : '';
  return `Hola, hoy llego una persona nueva a la red ${redNombre}: ${nombre}.${tel} Contactala.`;
};
