const PersonCard = ({ person, onDelete, onEdit }) => {

  return (
    <div className="person-card">
      <div className="person-header">
        <h3>{person.nombre} {person.apellido}</h3>
        <span className="person-age">{person.edad} años</span>
      </div>

      <div className="person-details">
        <p>📧 {person.email}</p>
        <p>📱 {person.telefono}</p>
        <p>
          🎂 {person.fechaNacimiento
            ? (() => {
              const [year, month, day] = person.fechaNacimiento.split('-');
              const date = new Date(year, month - 1, day); // 👈 local, sin UTC

              return date.toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
            })()
            : 'Sin fecha'}
        </p>
      </div>

      <div className="card-actions">
        <button
          className="btn-edit"
          onClick={() => onEdit(person)}
        >
          ✏️ Editar
        </button>

        <button
          className="btn-delete"
          onClick={() => onDelete(person.id)}
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
};

export default PersonCard;
