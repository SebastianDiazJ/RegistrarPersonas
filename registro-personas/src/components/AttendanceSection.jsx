import { useState } from 'react';
import { addAttendanceRecord, addCallRecord } from '../services/personService';

const SERVICIOS = [
  { id: 'sabado',    label: 'Sábado' },
  { id: 'domingo',   label: 'Domingo' },
  { id: 'miercoles', label: 'Miércoles' }
];

const RESULTADOS_LLAMADA = [
  { id: 'contesto',    label: 'Contestó',    cls: 'call-contesto' },
  { id: 'no_contesto', label: 'No contestó', cls: 'call-no-contesto' },
  { id: 'desinteres',  label: 'Desinterés',  cls: 'call-desinteres' }
];

const AttendanceSection = ({ person, red, onUpdate }) => {
  const [markingServicio, setMarkingServicio] = useState(null);
  const [markingCall, setMarkingCall] = useState(false);
  const [saving, setSaving] = useState(false);

  const asistencias = [...(person.asistencias || [])].sort((a, b) => b.id - a.id).slice(0, 10);
  const llamadas = [...(person.llamadas || [])].sort((a, b) => b.ts?.localeCompare(a.ts || '') || 0).slice(0, 5);
  const lastCall = llamadas[0];

  const handleMarkAsistencia = async (asistio) => {
    if (!markingServicio) return;
    setSaving(true);
    const result = await addAttendanceRecord(red, person.id, { servicio: markingServicio, asistio });
    if (result.success) onUpdate();
    setSaving(false);
    setMarkingServicio(null);
  };

  const handleMarkCall = async (resultado) => {
    setSaving(true);
    const result = await addCallRecord(red, person.id, { resultado });
    if (result.success) onUpdate();
    setSaving(false);
    setMarkingCall(false);
  };

  const lastCallLabel = (resultado) => {
    if (resultado === 'contesto') return 'Contestó';
    if (resultado === 'no_contesto') return 'No contestó';
    if (resultado === 'desinteres') return 'Desinterés';
    return resultado;
  };

  const callResultCls = (resultado) => {
    if (resultado === 'contesto') return 'call-result-ok';
    if (resultado === 'no_contesto') return 'call-result-no';
    if (resultado === 'desinteres') return 'call-result-dis';
    return '';
  };

  return (
    <div className="attendance-section">
      {/* ─── Asistencia ─── */}
      <div className="att-block">
        <div className="att-block-header">
          <span className="att-block-label">Asistencia</span>
          {asistencias.length > 0 && (
            <div className="att-history-chips">
              {asistencias.map(a => (
                <span
                  key={a.id}
                  className={`att-chip ${a.asistio ? 'att-chip-ok' : 'att-chip-no'}`}
                  title={`${a.fecha} — ${a.servicio}`}
                >
                  {a.asistio ? '✓' : '✗'}
                </span>
              ))}
            </div>
          )}
        </div>

        {markingServicio ? (
          <div className="att-confirm-row">
            <span className="att-confirm-label">
              ¿Asistió al {SERVICIOS.find(s => s.id === markingServicio)?.label}?
            </span>
            <button
              className="btn-att-si"
              onClick={() => handleMarkAsistencia(true)}
              disabled={saving}
            >
              Sí
            </button>
            <button
              className="btn-att-no"
              onClick={() => handleMarkAsistencia(false)}
              disabled={saving}
            >
              No
            </button>
            <button
              className="btn-att-cancel"
              onClick={() => setMarkingServicio(null)}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="att-services-row">
            {SERVICIOS.map(s => (
              <button
                key={s.id}
                className="btn-service"
                onClick={() => setMarkingServicio(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Llamada ─── */}
      <div className="att-block">
        <div className="att-block-header">
          <span className="att-block-label">Llamada</span>
          {lastCall && (
            <span className={`last-call-chip ${callResultCls(lastCall.resultado)}`}>
              {lastCallLabel(lastCall.resultado)} — {lastCall.fecha}
            </span>
          )}
        </div>

        {markingCall ? (
          <div className="call-options-row">
            {RESULTADOS_LLAMADA.map(r => (
              <button
                key={r.id}
                className={`btn-call-result ${r.cls}`}
                onClick={() => handleMarkCall(r.id)}
                disabled={saving}
              >
                {r.label}
              </button>
            ))}
            <button
              className="btn-att-cancel"
              onClick={() => setMarkingCall(false)}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            className="btn-registrar-llamada"
            onClick={() => setMarkingCall(true)}
          >
            Registrar llamada
          </button>
        )}

        {llamadas.length > 1 && (
          <div className="call-history-mini">
            {llamadas.slice(1).map((l, i) => (
              <span key={i} className={`call-hist-chip ${callResultCls(l.resultado)}`}>
                {lastCallLabel(l.resultado)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceSection;
