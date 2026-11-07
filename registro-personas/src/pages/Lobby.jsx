import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCountByRed } from '../services/personService';

const REDES = [
  { id: 'xtreme',  nombre: 'XTREME',  color: '#4338CA' },
  { id: 'parejas', nombre: 'PAREJAS', color: '#BE185D' },
  { id: '360',     nombre: '360',     color: '#0369A1' },
  { id: 'senior',  nombre: 'SENIOR',  color: '#B45309' }
];

const MODULOS = [
  { id: 'consolidacion', nombre: 'CONSOLIDACIÓN', desc: 'Registro y control de todas las redes', color: '#1B2D45', ruta: '/consolidacion/login' },
  { id: 'pastoral',      nombre: 'PASTORAL',      desc: 'Vista general y seguimiento',            color: '#065F46', ruta: '/pastoral/login' },
  { id: 'masivo',        nombre: 'INGRESO MASIVO', desc: 'Registro por cédula, sin contraseña',   color: '#0F766E', ruta: '/masivo/login' }
];

const Lobby = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ xtreme: 0, parejas: 0, '360': 0, senior: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      const results = await Promise.all(REDES.map(r => getCountByRed(r.id)));
      const newCounts = {};
      REDES.forEach((r, i) => { newCounts[r.id] = results[i].count; });
      setCounts(newCounts);
      setLoadingCounts(false);
    };
    loadCounts();
  }, []);

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="lobby">
      <div className="lobby-header">
        <div className="lobby-brand">
          <img className="lobby-logo" src="/logo-lavid.webp" alt="Iglesia La Vid" width="64" height="64" />
          <div>
          <span className="lobby-subtitle">Iglesia La Vid · Sistema de Registro</span>
          <h1 className="lobby-title">Redes Iglesia</h1>
          </div>
        </div>
        <div className="lobby-total">
          <span className="total-number">{loadingCounts ? '—' : total}</span>
          <span className="total-label">personas registradas</span>
        </div>
      </div>

      <h2 className="lobby-section-title">Redes</h2>
      <div className="lobby-cards">
        {REDES.map(red => (
          <div
            key={red.id}
            className="lobby-card"
            style={{ '--c1': red.color }}
            onClick={() => navigate(`/${red.id}/login`)}
          >
            <span className="lobby-card-count">
              {loadingCounts ? '—' : counts[red.id]}
              <span className="lobby-card-count-label">personas</span>
            </span>
            <span className="lobby-card-name">{red.nombre}</span>
          </div>
        ))}
      </div>

      <h2 className="lobby-section-title">Módulos</h2>
      <div className="lobby-cards lobby-cards-modulos">
        {MODULOS.map(m => (
          <button
            key={m.id}
            type="button"
            className="lobby-card lobby-card-modulo"
            style={{ '--c1': m.color }}
            onClick={() => navigate(m.ruta)}
          >
            <span className="lobby-card-desc">{m.desc}</span>
            <span className="lobby-card-name">{m.nombre}</span>
          </button>
        ))}
      </div>

      <p className="lobby-footer">Aplicación de registro y manejo de datos para la iglesia La Vid</p>
    </div>
  );
};

export default Lobby;
