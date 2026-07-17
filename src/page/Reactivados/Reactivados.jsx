import React from "react";
import PageNav from "../../Componentes/PageNav";
import "./Reactivados.css";

function Reactivados() {
  return (
    <div className="reactivados-page">
      <PageNav />
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
