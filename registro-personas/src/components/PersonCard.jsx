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
