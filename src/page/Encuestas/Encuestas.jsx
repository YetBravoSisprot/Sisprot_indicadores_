import React, { useState, useEffect } from "react";
import DropdownMenu from "../../Componentes/DropdownMenu";
import PageNav from "../../Componentes/PageNav";
import "./Encuestas.css";

// Muestra de datos inicial filtrada por la IA de n8n (< 12 pts y con comentario de cliente)
const INITIAL_SURVEY_ALERTS = [
  {
    id: "enc-001",
    clientName: "Jesús Daniel Rivas",
    identification: "V-20112344",
    phone: "+58 412-5551234",
    date: "2026-07-16",
    score: 8, // de 20
    aiClassification: "Crítico — Descontento con soporte técnico",
    clientComment: "He llamado 3 veces esta semana por lentitud y nadie me da respuesta. El servicio se cae por las tardes.",
    status: "Pendiente", // Pendiente, En proceso, Resuelto
    logs: [
      { date: "2026-07-16 14:30", author: "Sistema (n8n IA)", comment: "Alerta creada automáticamente. Calificación: 8/20." }
    ]
  },
  {
    id: "enc-002",
    clientName: "María Alejandra Pérez",
    identification: "V-18456908",
    phone: "+58 424-9988776",
    date: "2026-07-15",
    score: 10,
    aiClassification: "Moderado — Inconformidad con facturación",
    clientComment: "Me están cobrando un monto que no corresponde a mi plan residencial de fibra. Favor verificar.",
    status: "En proceso",
    logs: [
      { date: "2026-07-15 09:15", author: "Sistema (n8n IA)", comment: "Alerta creada automáticamente. Calificación: 10/20." },
      { date: "2026-07-16 10:00", author: "Kaloa", comment: "Se verificó en administración y se procedió a escalar a cobranzas." }
    ]
  },
  {
    id: "enc-003",
    clientName: "Carlos Eduardo Mendoza",
    identification: "V-15887223",
    phone: "+58 416-1122334",
    date: "2026-07-14",
    score: 5,
    aiClassification: "Urgente — Solicitud de cancelación de contrato",
    clientComment: "No tengo señal desde hace 5 días. Si no me solucionan hoy mismo voy a cancelar la suscripción.",
    status: "Resuelto",
    logs: [
      { date: "2026-07-14 11:00", author: "Sistema (n8n IA)", comment: "Alerta creada automáticamente. Calificación: 5/20." },
      { date: "2026-07-15 15:30", author: "Kaloa", comment: "Llamé al cliente. Se coordinó visita técnica de urgencia para el mismo día." },
      { date: "2026-07-15 18:00", author: "Kaloa", comment: "Técnico resolvió falla en acometida. Cliente confirma conformidad. Estatus cambiado a Resuelto." }
    ]
  },
  {
    id: "enc-004",
    clientName: "Patricia Elena Gómez",
    identification: "V-22119884",
    phone: "+58 414-7766554",
    date: "2026-07-13",
    score: 9,
    aiClassification: "Crítico — Retraso en instalación nueva",
    clientComment: "Pagué la instalación hace dos semanas y todavía no han venido los técnicos. Exijo fecha exacta.",
    status: "Pendiente",
    logs: [
      { date: "2026-07-13 16:45", author: "Sistema (n8n IA)", comment: "Alerta creada automáticamente. Calificación: 9/20." }
    ]
  }
];

function Encuestas() {
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem("sisprot_survey_alerts");
    return saved ? JSON.parse(saved) : INITIAL_SURVEY_ALERTS;
  });

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [newLogText, setNewLogText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("sisprot_survey_alerts", JSON.stringify(alerts));
  }, [alerts]);

  const handleOpenFollowUp = (alert) => {
    setSelectedAlert(alert);
    setNewStatus(alert.status);
    setNewLogText("");
    setShowModal(true);
  };

  const handleSaveFollowUp = () => {
    if (!newLogText.trim() && newStatus === selectedAlert.status) {
      alert("Por favor escribe una nota o cambia el estatus para guardar.");
      return;
    }

    const updatedAlerts = alerts.map((a) => {
      if (a.id === selectedAlert.id) {
        const updatedLogs = [...a.logs];
        if (newLogText.trim()) {
          const timestamp = new Date().toLocaleString();
          updatedLogs.push({
            date: timestamp,
            author: "Kaloa",
            comment: newLogText.trim()
          });
        }
        return {
          ...a,
          status: newStatus,
          logs: updatedLogs
        };
      }
      return a;
    });

    setAlerts(updatedAlerts);
    setShowModal(false);
    setSelectedAlert(null);
  };

  // Calcular contadores
  const totalAlerts = alerts.length;
  const pendingCount = alerts.filter((a) => a.status === "Pendiente").length;
  const inProgressCount = alerts.filter((a) => a.status === "En proceso").length;
  const resolvedCount = alerts.filter((a) => a.status === "Resuelto").length;

  return (
    <div className="encuestas-page">
      <DropdownMenu />
      <div className="report-header-info">
        <img
          src="./logo_sgf.png"
          alt="Logo de la empresa"
          className="company-logo"
        />
        <p className="author-text">SISPROT GLOBAL FIBER</p>
      </div>
      <PageNav />

      <div className="survey-container animate-slide-up">
        <div className="survey-header-row">
          <h2 className="section-title">💬 Monitoreo de Encuestas de Satisfacción (Alertas n8n)</h2>
          <button 
            className="pbi-dashboard-btn"
            onClick={() => alert("Próximamente se integrará el Dashboard de Power BI correspondiente a estas encuestas.")}
          >
            📊 Ver Reporte Completo
          </button>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card glass">
            <span className="stat-icon">🔔</span>
            <div className="stat-info">
              <h4>Alertas Filtradas IA</h4>
              <p className="stat-number">{totalAlerts}</p>
              <span className="stat-sub">Menos de 12pts + Comentario</span>
            </div>
          </div>
          <div className="stat-card glass status-pending">
            <span className="stat-icon">⏳</span>
            <div className="stat-info">
              <h4>Pendientes</h4>
              <p className="stat-number">{pendingCount}</p>
              <span className="stat-sub">Por contactar</span>
            </div>
          </div>
          <div className="stat-card glass status-progress">
            <span className="stat-icon">📞</span>
            <div className="stat-info">
              <h4>En Seguimiento</h4>
              <p className="stat-number">{inProgressCount}</p>
              <span className="stat-sub">En llamada / Gestión</span>
            </div>
          </div>
          <div className="stat-card glass status-resolved">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <h4>Resueltos</h4>
              <p className="stat-number">{resolvedCount}</p>
              <span className="stat-sub">Casos cerrados</span>
            </div>
          </div>
        </div>

        {/* Listado de Casos */}
        <div className="alerts-card glass">
          <h3 className="card-title">⚠️ Bandeja de Alertas Críticas</h3>
          <div className="table-responsive">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Fecha Alerta</th>
                  <th>Puntaje</th>
                  <th>Análisis IA n8n</th>
                  <th>Comentario Cliente</th>
                  <th>Estatus</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className={`row-status-${alert.status.toLowerCase().replace(" ", "-")}`}>
                    <td className="client-cell">
                      <strong>{alert.clientName}</strong>
                      <span className="client-sub">{alert.identification}</span>
                      <span className="client-sub">{alert.phone}</span>
                    </td>
                    <td>{alert.date}</td>
                    <td>
                      <span className={`score-badge ${alert.score <= 7 ? "score-low" : "score-mid"}`}>
                        {alert.score} / 20 pts
                      </span>
                    </td>
                    <td className="ia-cell">
                      <span className="ia-tag">{alert.aiClassification}</span>
                    </td>
                    <td className="comment-cell" title={alert.clientComment}>
                      {alert.clientComment}
                    </td>
                    <td>
                      <span className={`status-badge badge-${alert.status.toLowerCase().replace(" ", "-")}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-followup" onClick={() => handleOpenFollowUp(alert)}>
                        ✍️ Registrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Seguimiento */}
      {showModal && selectedAlert && (
        <div className="survey-modal-overlay">
          <div className="survey-modal glass">
            <div className="modal-header">
              <h3>Seguimiento de Caso — {selectedAlert.clientName}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-info-section">
                <p><strong>Comentario Original:</strong> "{selectedAlert.clientComment}"</p>
                <p><strong>Clasificación IA:</strong> <span className="ia-tag">{selectedAlert.aiClassification}</span></p>
              </div>

              <div className="modal-logs-timeline">
                <h4>Historial de Gestión:</h4>
                <div className="timeline-container">
                  {selectedAlert.logs.map((log, index) => (
                    <div key={index} className="timeline-item">
                      <span className="timeline-meta">{log.date} | {log.author}:</span>
                      <p className="timeline-comment">{log.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-form-section">
                <div className="form-group">
                  <label htmlFor="modal-status"><strong>Nuevo Estado:</strong></label>
                  <select
                    id="modal-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Resuelto">Resuelto</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="modal-comment"><strong>Agregar Nota de Gestión (Llamada, Visita, Solución):</strong></label>
                  <textarea
                    id="modal-comment"
                    rows="3"
                    value={newLogText}
                    onChange={(e) => setNewLogText(e.target.value)}
                    placeholder="Describe el contacto con el cliente y los acuerdos tomados..."
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSaveFollowUp}>Guardar Gestión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Encuestas;
