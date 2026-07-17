import React from "react";
import DropdownMenu from "../../Componentes/DropdownMenu";
import PageNav from "../../Componentes/PageNav";
import "./Reactivados.css";

function Reactivados() {
  return (
    <div className="reactivados-page">
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

      <div className="report-container animate-slide-up">
        {/* Aviso de Rotación para Móviles */}
        <div className="mobile-rotation-notice">
          <span className="notice-icon">📱🔄</span>
          <p className="notice-text">
            <strong>Tip de visualización:</strong> Para una mejor experiencia y ver los gráficos en detalle, te recomendamos colocar tu dispositivo en <strong>posición horizontal</strong>.
          </p>
        </div>

        <div className="report-card">
          <h3 className="report-title">
            📊 Control de Reactivados — Analista de Atención al Cliente
          </h3>
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
