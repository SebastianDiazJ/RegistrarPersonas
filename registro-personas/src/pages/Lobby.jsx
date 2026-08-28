import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCountByRed } from '../services/personService';

const REDES = [
  { id: 'xtreme',  nombre: 'XTREME',  color: '#4338CA' },
  { id: 'parejas', nombre: 'PAREJAS', color: '#BE185D' },
  { id: '360',     nombre: '360',     color: '#0369A1' },
  { id: 'senior',  nombre: 'SENIOR',  color: '#B45309' }
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
        <div>
          <span className="lobby-subtitle">Sistema de Registro</span>
          <h1 className="lobby-title">Redes Iglesia</h1>
        </div>
        <div className="lobby-total">
          <span className="total-number">{loadingCounts ? '—' : total}</span>
          <span className="total-label">personas registradas</span>
        </div>
      </div>

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

      <div className="lobby-footer-row">
        <p className="lobby-footer">Sistema de Registro de Redes</p>
        <button className="lobby-admin-link" onClick={() => navigate('/consolidacion/login')}>
          Consolidacion
        </button>
        <button className="lobby-admin-link" onClick={() => navigate('/pastoral/login')}>
          Pastoral
        </button>
      </div>
    </div>
  );
};

export default Lobby;
