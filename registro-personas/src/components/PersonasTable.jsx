import { useState, useMemo } from 'react';
import { deletePerson, updatePerson } from '../services/personService';
import { getCallAlertStatus } from '../services/callAlertService';

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const PersonasTable = ({ personas, red, redConfig, busqueda, onRefresh }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedId, setExpandedId] = useState(null);

  const personasFiltradas = useMemo(() => {
    let filtered = personas;

    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtered = personas.filter(p =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
        (p.telefono || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.prayerRequest || '').toLowerCase().includes(q)
      );
    }

    // Ordenar
    return filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'nombre':
          aVal = `${a.nombre} ${a.apellido}`.toLowerCase();
          bVal = `${b.nombre} ${b.apellido}`.toLowerCase();
          break;
        case 'telefono':
          aVal = a.telefono || '';
          bVal = b.telefono || '';
          break;
        case 'ultimallamada':
          aVal = new Date(a.lastCallDate || 0);
          bVal = new Date(b.lastCallDate || 0);
          break;
        case 'ausencias':
          aVal = a.ausencias || 0;
          bVal = b.ausencias || 0;
          break;
        default:
          return 0;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [personas, busqueda, sortBy, sortDir]);

  const handleEdit = (persona) => {
    setEditingId(persona.id);
    setEditForm({ ...persona });
  };

  const handleSave = async () => {
    if (editingId && editForm) {
      const result = await updatePerson(red, editingId, editForm);
      if (result.success) {
        setEditingId(null);
        setEditForm(null);
        onRefresh();
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta persona?')) {
      const result = await deletePerson(red, id);
      if (result.success) {
        onRefresh();
      }
    }
  };

  const handleMarkCalled = async (id, persona) => {
    const result = await updatePerson(red, id, {
      lastCallDate: new Date().toISOString(),
      callConfirmed: true
    });
    if (result.success) {
      onRefresh();
    }
  };

  const getSortIcon = (col) => {
    if (sortBy !== col) return '↕️';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const getCallStatusColor = (persona) => {
    const status = getCallAlertStatus(persona);
    if (status.isAlert) return '#fee2e2'; // Rojo claro
    if (persona.lastCallDate) return '#dcfce7'; // Verde claro
    return '#f3f4f6'; // Gris claro
  };

  const getAusenciasColor = (ausencias) => {
    if (!ausencias) return '#dcfce7';
    if (ausencias <= 2) return '#fef3c7';
    return '#fee2e2';
  };

  return (
    <div className="personas-table-container">
      <div className="table-meta">
        <p className="table-info">
          Mostrando <strong>{personasFiltradas.length}</strong> de <strong>{personas.length}</strong> personas
        </p>
      </div>

      {personasFiltradas.length === 0 ? (
        <div className="table-empty">
          {busqueda ? '❌ Sin resultados para esa búsqueda' : '📭 No hay personas registradas'}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="personas-table">
            <thead>
              <tr style={{ backgroundColor: redConfig.color1 + '20' }}>
                <th className="col-expand"></th>
                <th
                  className="col-nombre sortable"
                  onClick={() => {
                    if (sortBy === 'nombre') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('nombre'); setSortDir('asc'); }
                  }}
                  title="Ordenar por nombre"
                >
                  👤 Nombre {getSortIcon('nombre')}
                </th>
                <th
                  className="col-telefono sortable"
                  onClick={() => {
                    if (sortBy === 'telefono') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('telefono'); setSortDir('asc'); }
                  }}
                  title="Ordenar por teléfono"
                >
                  📱 Teléfono {getSortIcon('telefono')}
                </th>
                <th className="col-email">📧 Email</th>
                <th
                  className="col-llamada sortable"
                  onClick={() => {
                    if (sortBy === 'ultimallamada') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('ultimallamada'); setSortDir('asc'); }
                  }}
                  title="Ordenar por última llamada"
                >
                  📞 Última llamada {getSortIcon('ultimallamada')}
                </th>
                <th
                  className="col-ausencias sortable"
                  onClick={() => {
                    if (sortBy === 'ausencias') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    else { setSortBy('ausencias'); setSortDir('asc'); }
                  }}
                  title="Ordenar por ausencias"
                >
                  📵 Ausencias {getSortIcon('ausencias')}
                </th>
                <th className="col-acciones">⚙️ Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personasFiltradas.map((p) => {
                const callStatus = getCallAlertStatus(p);
                const isEditing = editingId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`table-row ${callStatus.isAlert ? 'alert' : ''}`}
                    style={{ backgroundColor: getCallStatusColor(p) }}
                  >
                    <td className="col-expand">
                      <button
                        className="btn-expand-row"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        title="Ver detalles"
                      >
                        {expandedId === p.id ? '▼' : '▶'}
                      </button>
                    </td>
                    <td className="col-nombre">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`${editForm.nombre} ${editForm.apellido}`}
                          onChange={(e) => {
                            const parts = e.target.value.split(' ');
                            setEditForm({
                              ...editForm,
                              nombre: parts[0],
                              apellido: parts.slice(1).join(' ')
                            });
                          }}
                          className="input-edit"
                        />
                      ) : (
                        <strong>{p.nombre} {p.apellido}</strong>
                      )}
                    </td>
                    <td className="col-telefono">
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editForm.telefono}
                          onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                          className="input-edit"
                        />
                      ) : (
                        <>
                          {p.telefono}
                          {p.telefono && (
                            <a href={`tel:${p.telefono}`} className="link-icon" title="Llamar">📞</a>
                          )}
                        </>
                      )}
                    </td>
                    <td className="col-email">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="input-edit"
                        />
                      ) : p.email ? (
                        <>
                          {p.email.substring(0, 20)}...
                          <a href={`mailto:${p.email}`} className="link-icon" title="Enviar email">✉️</a>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="col-llamada">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.lastCallDate ? editForm.lastCallDate.split('T')[0] : ''}
                          onChange={(e) => setEditForm({ ...editForm, lastCallDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="input-edit"
                        />
                      ) : p.lastCallDate ? (
                        <span className={callStatus.isAlert ? 'text-danger' : 'text-success'}>
                          {new Date(p.lastCallDate).toLocaleDateString('es-CO')}
                          {callStatus.isAlert && ' ⚠️'}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="col-ausencias">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editForm.ausencias || 0}
                          onChange={(e) => setEditForm({ ...editForm, ausencias: parseInt(e.target.value) || 0 })}
                          className="input-edit input-number"
                        />
                      ) : (
                        <span
                          className="ausencias-badge"
                          style={{
                            backgroundColor: getAusenciasColor(p.ausencias || 0),
                            padding: '4px 8px',
                            borderRadius: '6px',
                            display: 'inline-block',
                            minWidth: '40px',
                            textAlign: 'center'
                          }}
                        >
                          {p.ausencias || 0}
                        </span>
                      )}
                    </td>
                    <td className="col-acciones">
                      {isEditing ? (
                        <div className="action-buttons">
                          <button className="btn-save" onClick={handleSave}>✓ Guardar</button>
                          <button className="btn-cancel" onClick={() => setEditingId(null)}>✗ Cancelar</button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button className="btn-edit-row" onClick={() => handleEdit(p)} title="Editar">✏️</button>
                          <button
                            className="btn-call-row"
                            onClick={() => handleMarkCalled(p.id, p)}
                            title="Marcar como contactado"
                          >
                            📞
                          </button>
                          <button className="btn-delete-row" onClick={() => handleDelete(p.id)} title="Eliminar">🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalles expandibles */}
      {expandedId && personasFiltradas.find(p => p.id === expandedId) && (
        <div className="row-details">
          <PersonaDetails
            persona={personasFiltradas.find(p => p.id === expandedId)}
            redConfig={redConfig}
          />
        </div>
      )}
    </div>
  );
};

const PersonaDetails = ({ persona: p, redConfig }) => {
  const callStatus = getCallAlertStatus(p);

  return (
    <div className="details-grid" style={{ borderLeftColor: redConfig.color1 }}>
      <div className="detail-row">
        <span className="detail-label">👤 Nombre completo:</span>
        <span className="detail-value">{p.nombre} {p.apellido}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">📱 Teléfono:</span>
        <span className="detail-value">
          {p.telefono ? <a href={`tel:${p.telefono}`}>{p.telefono}</a> : '—'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">📧 Email:</span>
        <span className="detail-value">
          {p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : '—'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">👤 A cargo de:</span>
        <span className="detail-value">{p.aCargoDe || '—'}</span>
      </div>
      {p.prayerRequest && (
        <div className="detail-row detail-row-full">
          <span className="detail-label">🙏 Petición de oración:</span>
          <span className="detail-value prayer-text">{p.prayerRequest}</span>
        </div>
      )}
      <div className="detail-row">
        <span className="detail-label">📊 Estado de llamada:</span>
        <span className="detail-value">
          {callStatus.isAlert ? '⚠️ Necesita contacto (48+ hrs)' : p.lastCallDate ? '✓ Al día' : '❓ Nunca contactado'}
        </span>
      </div>
      <div className="detail-row">
        <span className="detail-label">📵 Ausencias:</span>
        <span className="detail-value">{p.ausencias || 0}</span>
      </div>
      {p.createdAt && (
        <div className="detail-row">
          <span className="detail-label">📅 Registrado:</span>
          <span className="detail-value">{new Date(p.createdAt).toLocaleDateString('es-CO')}</span>
        </div>
      )}
    </div>
  );
};

export default PersonasTable;
