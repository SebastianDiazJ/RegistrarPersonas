// Filtros de entrada: se aplican mientras se escribe para que solo entren caracteres válidos.
export const onlyLetters = (v) => (v || '').replace(/[^\p{L}\s]/gu, '');
export const onlyDigits = (v) => (v || '').replace(/\D/g, '');
