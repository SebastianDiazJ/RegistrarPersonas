import { getCallAlertStatus } from '../services/callAlertService';

const MESES = [
  '','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const formatCumple = (person) => {
  if (person.mesCumple && person.diaCumple) {
    return `${person.diaCumple} de ${MESES[parseInt(person.mesCumple)]}`;
  }
  if (person.fechaNacimiento) {
    const parts = person.fechaNacimiento.split('-');
    const mes = parseInt(parts[1]);
    const dia = parseInt(parts[2]);
    return `${dia} de ${MESES[mes]}`;
  }
  return 'Sin fecha';
};

const getAusenciasConfig = (n) => {
  if (n === 0) return { label: 'Sin ausencias', cls: 'ausencias-ok' };
  if (n <= 2)  return { label: `${n} ausencia${n > 1 ? 's' : ''}`, cls: 'ausencias-warn' };
  return { label: `${n} ausencias`, cls: 'ausencias-danger' };
};

const PersonCard = ({ person, onDelete, onEdit, onAbsence, onResetAbsences, onMarkCalled }) => {
  const ausencias = person.ausencias || 0;
  const { label, cls } = getAusenciasConfig(ausencias);
  const callStatus = getCallAlertStatus(person);

  return (
    <div className="person-card">
      <div className="person-header">
        <h3>{person.nombre} {person.apellido}</h3>
        {person.edad ? <span className="person-age">{person.edad} anos</span> : null}
      </div>

      <div className="person-details">
        {person.email && (
          <p><span style={{ fontWeight: 600, color: 'var(--t2)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Email</span> {person.email}</p>
        )}
        {person.telefono && (
          <p><span style={{ fontWeight: 600, color: 'var(--t2)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Tel</span> {person.telefono}</p>
        )}
        <p><span style={{ fontWeight: 600, color: 'var(--t2)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Cumple</span> {formatCumple(person)}</p>
        {person.aCargoDe && (
          <p className="a-cargo">A cargo de: <strong>{person.aCargoDe}</strong></p>
        )}
        {person.prayerRequest && (
          <p className="prayer-request">Oracion: {person.prayerRequest}</p>
        )}
        {person.lastCallDate && (
          <p className="call-date">Ultima llamada: {new Date(person.lastCallDate).toLocaleDateString('es-CO')}</p>
        )}
      </div>

      <div className="ausencias-row">
        <span className={`ausencias-badge ${cls}`}>{label}</span>
        <button className="btn-ausencia" onClick={() => onAbsence(person.id)}>
          + Ausencia
        </button>
        {ausencias > 0 && (
          <button className="btn-reset-ausencias" onClick={() => onResetAbsences(person.id)}>
            Reiniciar
          </button>
        )}
      </div>

      {onMarkCalled && (
        <div className="call-status-row">
          {callStatus.isAlert ? (
            <span className="call-alert-badge">Necesita contacto</span>
          ) : person.lastCallDate ? (
            <span className="call-ok-badge">Al dia</span>
          ) : (
            <span className="call-never-badge">Nunca contactado</span>
          )}
          <button
            className="btn-mark-called"
            onClick={() => onMarkCalled(person.id)}
          >
            Ya llame
          </button>
        </div>
      )}

      <div className="card-actions">
        <button className="btn-edit" onClick={() => onEdit(person)}>Editar</button>
        <button className="btn-delete" onClick={() => onDelete(person.id)}>Eliminar</button>
      </div>
    </div>
  );
};

export default PersonCard;
