import React, { useState } from "react";
import PageNav from "../../Componentes/PageNav";
import "./Reactivados.css";

function Reactivados() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="reactivados-page">
      <PageNav />
      
      {/* Sección de Credenciales de Acceso */}
      <div className={`access-credentials-card ${isOpen ? 'is-open' : ''}`}>
        <div className="credentials-header" onClick={() => setIsOpen(!isOpen)}>
          <span style={{ fontSize: '1.4rem' }}>🔐</span>
          <h4>Credenciales de Acceso Corporativo</h4>
          <span className={`toggle-icon ${isOpen ? 'rotated' : ''}`}>▼</span>
        </div>
        
        <div className="credentials-collapsible-content">
          <div className="credential-item">
            <div className="credential-content">
              <span className="credential-label">Usuario:</span>
              <span className="credential-value" id="user-val">ybravo@sisprotgf.com</span>
            </div>
            <button 
              className="copy-btn" 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText("ybravo@sisprotgf.com");
                alert("Usuario copiado");
              }}
              title="Copiar Usuario"
            >
              📋
            </button>
          </div>

          <div className="credential-item">
            <div className="credential-content">
              <span className="credential-label">Contraseña:</span>
              <span className="credential-value" id="pass-val">Sisprot.150725</span>
            </div>
            <button 
              className="copy-btn" 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText("Sisprot.150725");
                alert("Contraseña copiada");
              }}
              title="Copiar Contraseña"
            >
              📋
            </button>
          </div>

          <span className="access-note">
            * Use estos datos si el sistema solicita inicio de sesión para visualizar los tableros.
          </span>
        </div>
      </div>

      <div className="report-fullscreen-container animate-slide-up">
        <iframe
          title="Control de Reactivados"
          src="https://app.powerbi.com/reportEmbed?reportId=0197f90e-4a1a-4025-80bf-e9c07b955a6b&autoAuth=true&experience=power-bi"
          frameBorder="0"
          allowFullScreen={true}
        ></iframe>
      </div>
    </div>
  );
}

export default Reactivados;
