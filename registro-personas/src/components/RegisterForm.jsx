import { useState, useEffect } from 'react';
import { addPerson, updatePerson, buildCallRecord } from '../services/personService';
import { getRedInfo } from '../services/redService';
import { buildWhatsAppLink, buildNewPersonMessage } from '../services/whatsappService';
import { METODOS_INVITACION, RESULTADOS_LLAMADA, MESES, diasPorMes, normalizeMetodo } from '../config/opciones';
import { onlyLetters, onlyDigits } from '../utils/validacion';

const todayISO = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM = () => ({
  nombre: '',
  apellido: '',
  edad: '',
  email: '',
  telefono: '',
  mesCumple: '',
  diaCumple: '',
  aCargoDe: '',
  metodoInvitacion: '',
  fechaIngreso: todayISO(),
  prayerRequest: '',
  contesto: '',
  observacion: ''
});

const RegisterForm = ({ red, selectedPerson, onFinish }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [redInfo, setRedInfo] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);

  useEffect(() => {
    getRedInfo(red).then(res => { if (res.success) setRedInfo(res.data); });
  }, [red]);

  useEffect(() => {
    setLastAdded(null);
    if (selectedPerson) {
      let mes = '';
      let dia = '';
      if (selectedPerson.fechaNacimiento) {
        const parts = selectedPerson.fechaNacimiento.split('-');
        if (parts.length >= 2) {
          mes = String(parseInt(parts[1]));
          dia = String(parseInt(parts[2] || parts[1]));
          if (parts.length === 2) { mes = parts[0]; dia = parts[1]; }
        }
      }
      if (selectedPerson.mesCumple) mes = selectedPerson.mesCumple;
      if (selectedPerson.diaCumple) dia = selectedPerson.diaCumple;

      setForm({
        nombre: selectedPerson.nombre || '',
        apellido: selectedPerson.apellido || '',
        edad: selectedPerson.edad || '',
        email: selectedPerson.email || '',
        telefono: selectedPerson.telefono || '',
        mesCumple: mes,
        diaCumple: dia,
        aCargoDe: selectedPerson.aCargoDe || '',
        metodoInvitacion: normalizeMetodo(selectedPerson.metodoInvitacion),
        fechaIngreso: selectedPerson.fechaIngreso || todayISO(),
        prayerRequest: selectedPerson.prayerRequest || '',
        contesto: '',
        observacion: ''
      });
    } else {
      setForm(f => ({ ...f, fechaIngreso: todayISO() }));
    }
  }, [selectedPerson]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { mesCumple, diaCumple, contesto, observacion, ...rest } = form;

    const personData = {
      ...rest,
      mesCumple,
      diaCumple,
      fechaNacimiento: mesCumple && diaCumple
        ? `2000-${String(mesCumple).padStart(2,'0')}-${String(diaCumple).padStart(2,'0')}`
        : ''
    };

    if (selectedPerson) {
      await updatePerson(red, selectedPerson.id, personData);
      setLastAdded(null);
    } else {
      // Llamada inicial opcional: solo si eligieron el resultado
      if (contesto) {
        const record = buildCallRecord({ resultado: contesto, observacion });
        personData.llamadas = [record];
        personData.lastCallDate = record.ts;
        personData.lastCallResult = contesto;
      }
      await addPerson(red, personData);
      setLastAdded({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono });
    }
    onFinish();
    setForm(EMPTY_FORM());
  };

  const diasDisponibles = form.mesCumple ? diasPorMes(parseInt(form.mesCumple)) : 31;
  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setFiltered = (field, filter) => (e) => setForm(f => ({ ...f, [field]: filter(e.target.value) }));

  return (
    <div className="register-form">
      <h2>{selectedPerson ? 'Editar persona' : 'Registrar persona'}</h2>

      {lastAdded && !selectedPerson && (
        <div className="consol-feedback-ok whatsapp-banner">
          <span>{lastAdded.nombre} {lastAdded.apellido} fue registrado/a correctamente.</span>
          {redInfo?.whatsapp ? (
            <a
              className="btn-whatsapp"
              href={buildWhatsAppLink(redInfo.whatsapp, buildNewPersonMessage(redInfo.nombre || red, lastAdded))}
              target="_blank"
              rel="noopener noreferrer"
            >
              Avisar por WhatsApp{redInfo.liderNombre ? ` a ${redInfo.liderNombre}` : ''}
            </a>
          ) : (
            <span className="whatsapp-hint">Configura el WhatsApp del líder en el Módulo Pastoral</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label>Nombre</label>
          <input value={form.nombre} onChange={setFiltered('nombre', onlyLetters)} placeholder="Nombre" autoComplete="off" />
        </div>

        <div className="form-group">
          <label>Apellido</label>
          <input value={form.apellido} onChange={setFiltered('apellido', onlyLetters)} placeholder="Apellido" autoComplete="off" />
        </div>

        <div className="form-group">
          <label>Teléfono</label>
          <input value={form.telefono} onChange={setFiltered('telefono', onlyDigits)} placeholder="3001234567" type="tel" inputMode="numeric" />
        </div>

        <div className="form-group">
          <label>Correo electrónico</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="correo@ejemplo.com" />
        </div>

        <div className="form-group">
          <label>Edad</label>
          <input value={form.edad} onChange={setFiltered('edad', v => onlyDigits(v).slice(0, 3))} placeholder="25" inputMode="numeric" />
        </div>

        <div className="form-group">
          <label>Cumpleaños</label>
          <div className="cumple-row">
            <select value={form.mesCumple} onChange={e => setForm(f => ({ ...f, mesCumple: e.target.value, diaCumple: '' }))}>
              <option value="">Mes</option>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={form.diaCumple} onChange={set('diaCumple')} disabled={!form.mesCumple}>
              <option value="">Día</option>
              {Array.from({ length: diasDisponibles }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Fecha de ingreso</label>
          <input type="date" value={form.fechaIngreso} onChange={set('fechaIngreso')} />
        </div>

        <div className="form-group">
          <label>Método de invitación</label>
          <select value={form.metodoInvitacion} onChange={set('metodoInvitacion')}>
            <option value="">Seleccionar...</option>
            {METODOS_INVITACION.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>A cargo de</label>
          <input value={form.aCargoDe} onChange={setFiltered('aCargoDe', onlyLetters)} placeholder="Nombre del responsable" autoComplete="off" />
        </div>

        <div className="form-group">
          <label>Petición de oración</label>
          <textarea value={form.prayerRequest} onChange={set('prayerRequest')} rows="2" placeholder="(opcional)" />
        </div>

        {!selectedPerson && (
          <>
            <div className="form-group">
              <label>¿Contestó la llamada?</label>
              <select value={form.contesto} onChange={e => setForm(f => ({ ...f, contesto: e.target.value, observacion: e.target.value ? f.observacion : '' }))}>
                <option value="">Sin llamar aún</option>
                {RESULTADOS_LLAMADA.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Observación de la llamada</label>
              <textarea
                value={form.observacion}
                onChange={set('observacion')}
                rows="2"
                disabled={!form.contesto}
                placeholder={form.contesto ? '(opcional)' : 'Primero elige el resultado de la llamada'}
              />
            </div>
          </>
        )}

        <button className="btn-submit">
          {selectedPerson ? 'Actualizar' : 'Registrar'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
