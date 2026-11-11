import { useState, useEffect } from 'react';
import { getAllPersons } from '../services/personService';
import { onlyLetters, sanitizeName } from '../utils/validacion';

const OTRO = '__otro__';

// Nombres que ya aparecen como "a cargo de" en una red (para ofrecerlos en la lista).
export const useResponsablesRed = (red) => {
  const [nombres, setNombres] = useState([]);
  useEffect(() => {
    let vivo = true;
    getAllPersons(red).then(res => {
      if (!vivo || !res.success) return;
      const vistos = new Map();
      res.data.forEach(p => {
        const n = sanitizeName(p.aCargoDe || '');
        if (n && !vistos.has(n.toLowerCase())) vistos.set(n.toLowerCase(), n);
      });
      setNombres([...vistos.values()].sort((a, b) => a.localeCompare(b, 'es')));
    });
    return () => { vivo = false; };
  }, [red]);
  return nombres;
};

// Selector de "A cargo de": primero el líder de la red, luego los responsables que ya
// existen en esa red y, si hace falta, la opción de escribir otro nombre.
const LiderSelect = ({ liderNombre, responsables = [], value, onChange, error }) => {
  const lider = sanitizeName(liderNombre || '');
  const otros = responsables.filter(n => n.toLowerCase() !== lider.toLowerCase());
  const opciones = [lider, ...otros].filter(Boolean);
  const enLista = opciones.some(o => o.toLowerCase() === (value || '').toLowerCase());
  const [modoOtro, setModoOtro] = useState(false);
  const valorSelect = modoOtro || (value && !enLista) ? OTRO : (opciones.find(o => o.toLowerCase() === (value || '').toLowerCase()) || '');

  const handleSelect = (e) => {
    if (e.target.value === OTRO) { setModoOtro(true); onChange(''); return; }
    setModoOtro(false);
    onChange(e.target.value);
  };

  return (
    <>
      <select value={valorSelect} onChange={handleSelect}>
        <option value="">Seleccionar líder...</option>
        {lider && <optgroup label="Líder de la red"><option value={lider}>{lider}</option></optgroup>}
        {otros.length > 0 && (
          <optgroup label="Responsables de la red">
            {otros.map(n => <option key={n} value={n}>{n}</option>)}
          </optgroup>
        )}
        <option value={OTRO}>Otro (escribir nombre)...</option>
      </select>
      {valorSelect === OTRO && (
        <input
          value={value}
          onChange={e => onChange(onlyLetters(e.target.value).slice(0, 60))}
          placeholder="Nombre del responsable"
          autoComplete="off"
          style={{ marginTop: '0.4rem' }}
        />
      )}
      {!lider && opciones.length === 0 && (
        <span className="masivo-aviso" style={{ margin: 0 }}>Aún no hay líder configurado para esta red (Pastoral → Líderes y contacto).</span>
      )}
      {error && <span className="masivo-field-error">{error}</span>}
    </>
  );
};

export default LiderSelect;
