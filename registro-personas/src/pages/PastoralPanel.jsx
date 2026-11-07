import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { REDES } from '../config/redes';
import PersonasTable from '../components/PersonasTable';
import BaseGeneralPanel from '../components/BaseGeneralPanel';
import HistorialPanel from '../components/HistorialPanel';
import { useVistaGlobal, GlobalKpis, ResumenTab, LideresTab, ComparativasTab } from '../components/VistaGlobal';

const PastoralPanel = () => {
  const navigate = useNavigate();
  const { logoutPastor } = useAuth();

  const [activeTab, setActiveTab] = useState('resumen');
  const {
    rawPersonas, redesInfo, loading, reload,
    statsByRed, callSummaryByRed, globalTotals, updateRedInfo
  } = useVistaGlobal();

  // Personas tab
  const [redConsulta, setRedConsulta] = useState('xtreme');
  const [busqueda, setBusqueda] = useState('');
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('');

  const handleLogout = async () => { await logoutPastor(); navigate('/'); };

  const redConsultaConfig = REDES.find(r => r.id === redConsulta);

  return (
    <div className="consol-panel">
      <div className="consol-header">
        <div className="consol-header-left">
          <h1 className="consol-title">Pastoral</h1>
          <p className="consol-subtitle">Vista general del CRM — todas las redes</p>
        </div>
        <div className="consol-header-right">
          <button className="btn-lobby" onClick={() => navigate('/')}>Lobby</button>
          <button className="btn-cerrar-sesion" onClick={handleLogout}>Cerrar sesion</button>
        </div>
      </div>

      <div className="consol-body">
        {loading ? (
          <div className="loading">Cargando información pastoral...</div>
        ) : (
          <>
            <GlobalKpis rawPersonas={rawPersonas} globalTotals={globalTotals} />

            {/* Tabs */}
            <div className="consol-main-tabs">
              {[
                { id: 'resumen',      label: 'Resumen general' },
                { id: 'personas',     label: 'Personas por red' },
                { id: 'lideres',      label: 'Líderes y contacto' },
                { id: 'estadisticas', label: 'Estadísticas comparativas' },
                { id: 'base',         label: 'Base general' },
                { id: 'historial',    label: 'Historial de cambios' }
              ].map(t => (
                <button
                  key={t.id}
                  className={`consol-main-tab ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'resumen' && (
              <ResumenTab redesInfo={redesInfo} statsByRed={statsByRed} callSummaryByRed={callSummaryByRed} />
            )}

            {/* ── Personas por red ── */}
            {activeTab === 'personas' && (
              <div className="consol-consulta-card">
                <div className="consol-red-tabs">
                  {REDES.map(red => (
                    <button
                      key={red.id}
                      type="button"
                      className={`consol-red-tab ${redConsulta === red.id ? 'active' : ''}`}
                      style={{ '--c1': red.color }}
                      onClick={() => { setRedConsulta(red.id); setBusqueda(''); setFiltroServicio('todos'); setFiltroFecha(''); }}
                    >
                      {red.nombre}
                      <span className="consol-tab-badge">{(rawPersonas[red.id] || []).length}</span>
                    </button>
                  ))}
                </div>

                <div className="consulta-filtros">
                  <div className="form-group" style={{ flex: '2', minWidth: '180px' }}>
                    <label>Buscar</label>
                    <input
                      className="search-input"
                      type="text"
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      placeholder="Nombre, teléfono, email..."
                      style={{ '--c1': redConsultaConfig.color }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '130px' }}>
                    <label>Servicio asistido</label>
                    <select className="filtro-cargo-select" value={filtroServicio} onChange={e => setFiltroServicio(e.target.value)}>
                      <option value="todos">Todos</option>
                      <option value="sabado">Sábado</option>
                      <option value="domingo">Domingo</option>
                      <option value="miercoles">Miércoles</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1', minWidth: '140px' }}>
                    <label>Fecha asistencia</label>
                    <input
                      className="filtro-cargo-select"
                      type="date"
                      value={filtroFecha}
                      onChange={e => setFiltroFecha(e.target.value)}
                    />
                  </div>
                  {(filtroServicio !== 'todos' || filtroFecha) && (
                    <button className="btn-clear-filtros" onClick={() => { setFiltroServicio('todos'); setFiltroFecha(''); }}>
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <PersonasTable
                  personas={rawPersonas[redConsulta] || []}
                  red={redConsulta}
                  redConfig={redConsultaConfig}
                  busqueda={busqueda}
                  filtroServicio={filtroServicio !== 'todos' ? filtroServicio : ''}
                  filtroFecha={filtroFecha}
                  onRefresh={reload}
                />
              </div>
            )}

            {activeTab === 'lideres' && (
              <LideresTab rawPersonas={rawPersonas} redesInfo={redesInfo} onSaved={updateRedInfo} />
            )}

            {activeTab === 'estadisticas' && <ComparativasTab rawPersonas={rawPersonas} />}

            {activeTab === 'base' && <BaseGeneralPanel />}

            {activeTab === 'historial' && <HistorialPanel />}
          </>
        )}
      </div>
    </div>
  );
};

export default PastoralPanel;
