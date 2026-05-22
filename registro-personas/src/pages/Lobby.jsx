import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCountByRed } from '../services/personService';

const REDES = [
  { id: 'xtreme', nombre: 'XTREME', emoji: '🔥', color1: '#667eea', color2: '#764ba2' },
  { id: 'parejas', nombre: 'PAREJAS', emoji: '💑', color1: '#f093fb', color2: '#f5576c' },
  { id: '360', nombre: '360', emoji: '🌐', color1: '#4facfe', color2: '#00f2fe' }
];

const Lobby = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ xtreme: 0, parejas: 0, '360': 0 });
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
        <h1 className="lobby-title">Sistema de Redes</h1>
        <p className="lobby-subtitle">Selecciona tu red para continuar</p>
        <div className="lobby-total">
          <span className="total-number">{loadingCounts ? '—' : total}</span>
          <span className="total-label">personas registradas en total</span>
        </div>
      </div>

      <div className="lobby-cards">
        {REDES.map(red => (
          <div
            key={red.id}
            className="lobby-card"
            style={{ '--c1': red.color1, '--c2': red.color2 }}
            onClick={() => navigate(`/${red.id}/login`)}
          >
            <div className="lobby-card-glow" />
            <span className="lobby-card-emoji">{red.emoji}</span>
            <h2 className="lobby-card-name">{red.nombre}</h2>
            <div className="lobby-card-count">
              {loadingCounts ? '—' : counts[red.id]}
              <span className="lobby-card-count-label">personas</span>
            </div>
            <button className="lobby-card-btn">Entrar</button>
          </div>
        ))}
      </div>

      <p className="lobby-footer">Sistema de Registro — Iglesia</p>
    </div>
  );
};

export default Lobby;
