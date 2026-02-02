import { useState } from 'react';
import RegisterForm from './components/RegisterForm';
import PersonList from './components/PersonList';
import './App.css';

function App() {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState('register');

  const handleEdit = (person) => {
    setSelectedPerson(person);
    setActiveTab('register');
  };

  const finishEdit = () => {
    setSelectedPerson(null);
     setRefresh(prev => !prev)
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Registro de Personas XTREME</h1>
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
          <RegisterForm
            selectedPerson={selectedPerson}
            onFinish={finishEdit}
          />
        ) : (
          <PersonList
            refresh={refresh}
            onEdit={handleEdit}
          />
        )}
      </main>
    </div>
  );
}

export default App;