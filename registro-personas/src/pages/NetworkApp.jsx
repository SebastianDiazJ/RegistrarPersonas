import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import PersonList from '../components/PersonList';
import { useAuth } from '../context/AuthContext';

const REDES_CONFIG = {
  xtreme:  { nombre: 'XTREME',  emoji: '🔥', color1: '#667eea', color2: '#764ba2' },
  parejas: { nombre: 'PAREJAS', emoji: '💑', color1: '#f093fb', color2: '#f5576c' },
  '360':   { nombre: '360',     emoji: '🌐', color1: '#4facfe', color2: '#00f2fe' }
};

const NetworkApp = ({ red }) => {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState('register');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const config = REDES_CONFIG[red];

  const handleEdit = (person) => {
    setSelectedPerson(person);
    setActiveTab('register');
  };

  const finishEdit = () => {
    setSelectedPerson(null);
    setRefresh(prev => !prev);
  };

  const handleSalir = () => {
    logout(red);
    navigate('/');
  };

  return (
    <div
      className="app"
      style={{ '--c1': config.color1, '--c2': config.color2 }}
    >
      <header className="app-header">
        <button className="btn-lobby" onClick={() => navigate('/')}>
          ← Lobby
        </button>
        <h1>{config.emoji} Red {config.nombre}</h1>
        <button className="btn-cerrar-sesion" onClick={handleSalir}>
          Cerrar sesión
        </button>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          ➕ Registrar
        </button>
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          👥 Consultar
        </button>
      </nav>

      <main className="app-content">
        {activeTab === 'register' ? (
          <RegisterForm red={red} selectedPerson={selectedPerson} onFinish={finishEdit} />
        ) : (
          <PersonList red={red} refresh={refresh} onEdit={handleEdit} />
        )}
      </main>
    </div>
  );
};

export default NetworkApp;
