import AttendanceSection from './AttendanceSection';

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
    return `${parseInt(parts[2])} de ${MESES[parseInt(parts[1])]}`;
  }
  return null;
};

const PersonCard = ({ person, red, onDelete, onEdit, onUpdate }) => {
  const cumple = formatCumple(person);

  return (
    <div className="person-card">
      <div className="person-header">
        <h3>{person.nombre} {person.apellido}</h3>
        {person.edad ? <span className="person-age">{person.edad} años</span> : null}
      </div>

      <div className="person-details">
        {person.telefono && (
          <p>
            <span className="detail-pill-label">Tel</span>
            <a href={`tel:${person.telefono}`} className="detail-link">{person.telefono}</a>
          </p>
        )}
        {person.email && (
          <p>
            <span className="detail-pill-label">Email</span>
            <a href={`mailto:${person.email}`} className="detail-link">{person.email}</a>
          </p>
        )}
        {cumple && (
          <p>
            <span className="detail-pill-label">Cumple</span>
            {cumple}
          </p>
        )}
        {person.fechaIngreso && (
          <p>
            <span className="detail-pill-label">Ingresó</span>
            {new Date(person.fechaIngreso).toLocaleDateString('es-CO')}
          </p>
        )}
        {person.metodoInvitacion && (
          <p>
            <span className="detail-pill-label">Via</span>
            {person.metodoInvitacion}
          </p>
        )}
        {person.aCargoDe && (
          <p className="a-cargo">
            Lider: <strong>{person.aCargoDe}</strong>
          </p>
        )}
        {person.prayerRequest && (
          <p className="prayer-request">Oracion: {person.prayerRequest}</p>
        )}
      </div>

      <AttendanceSection person={person} red={red} onUpdate={onUpdate} />

      <div className="card-actions">
        <button className="btn-edit" onClick={() => onEdit(person)}>Editar</button>
        <button className="btn-delete" onClick={() => onDelete(person.id)}>Eliminar</button>
      </div>
    </div>
  );
};

export default PersonCard;
