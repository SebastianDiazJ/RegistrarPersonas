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

const PersonCard = ({ person, onDelete, onEdit, onAbsence, onResetAbsences }) => {
  const ausencias = person.ausencias || 0;
  const { label, cls } = getAusenciasConfig(ausencias);

  return (
    <div className="person-card">
      <div className="person-header">
        <h3>{person.nombre} {person.apellido}</h3>
        <span className="person-age">{person.edad} años</span>
      </div>

      <div className="person-details">
        {person.email ? <p>📧 {person.email}</p> : null}
        <p>📱 {person.telefono}</p>
        <p>🎂 {formatCumple(person)}</p>
        {person.aCargoDe && (
          <p className="a-cargo">👤 A cargo de: <strong>{person.aCargoDe}</strong></p>
        )}
      </div>

      <div className="ausencias-row">
        <span className={`ausencias-badge ${cls}`}>{label}</span>
        <button className="btn-ausencia" onClick={() => onAbsence(person.id)} title="Registrar ausencia">
          + Ausencia
        </button>
        {ausencias > 0 && (
          <button className="btn-reset-ausencias" onClick={() => onResetAbsences(person.id)} title="Reiniciar contador">
            ↺
          </button>
        )}
      </div>

      <div className="card-actions">
        <button className="btn-edit" onClick={() => onEdit(person)}>✏️ Editar</button>
        <button className="btn-delete" onClick={() => onDelete(person.id)}>🗑️ Eliminar</button>
      </div>
    </div>
  );
};

export default PersonCard;
