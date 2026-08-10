import React, { useState } from "react";
import PageNav from "../../Componentes/PageNav";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./Reactivados.css";

function Reactivados() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="reactivados-page">
      <DropdownMenu />
      {/* Contenedor para el logo y el texto "Realizado por" */}
      <div className="report-header-info">
        <img
          src="./logo_sgf.png"
          alt="Logo de la empresa"
          className="company-logo"
        />
        <p className="author-text">SISPROT GLOBAL FIBER</p>
      </div>
      <PageNav />
      
      {/* Contenedor para los informes de Power BI con un diseño responsivo */}
      <div className="report-container">
        
        {/* Sección de Credenciales de Acceso */}
        <div className={`access-credentials-card ${isOpen ? 'is-open' : ''}`}>
          <div className="credentials-header" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>🔐</span>
            <h4>Credenciales de Acceso Corporativo</h4>
            <span className={`toggle-icon ${isOpen ? 'rotated' : ''}`}>▼</span>
          </div>
          
          <div className="credentials-collapsible-content">
            <div className="credential-item">
              <div className="credential-content">
                <span className="credential-label">Usuario:</span>
                <span className="credential-value" id="user-val">*****@sispr****.com</span>
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
                <span className="credential-value" id="pass-val">**********</span>
              </div>
              <button 
                className="copy-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText("Prueba123");
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

        {/* Aviso de Rotación para Móviles */}
        <div className="mobile-rotation-notice">
          <span className="notice-icon">📱🔄</span>
          <p className="notice-text">
            <strong>Tip de visualización:</strong> Para una mejor experiencia y ver los gráficos en detalle, te recomendamos colocar tu dispositivo en <strong>posición horizontal</strong>.
          </p>
        </div>

        {/* Estructura del Reporte */}
        <div className="report-card">
          <h3 className="report-title">Control de Reactivados</h3>
          <div className="iframe-wrapper">
            <iframe
              title="Control de Reactivados"
              src="https://app.powerbi.com/reportEmbed?reportId=0197f90e-4a1a-4025-80bf-e9c07b955a6b&autoAuth=true&experience=power-bi"
              frameBorder="0"
              allowFullScreen={true}
            ></iframe>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Reactivados;
