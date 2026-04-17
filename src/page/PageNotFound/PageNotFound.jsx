import DropdownMenu from "../../Componentes/DropdownMenu";
import PageNav from "../../Componentes/PageNav";
import "./PageNotFound.css"; // Asegúrate de que este CSS esté actualizado

function PageNotFound() {
  return (
    <div className="page-not-found">
      <DropdownMenu />
      {/* Contenedor para el logo y el texto "Realizado por" */}
      <div className="report-header-info">
        <img
          src="./logo_sgf.png" // ¡IMPORTANTE! Reemplaza con la URL de tu logo
          alt="Logo de la empresa"
          className="company-logo"
        />
        <p className="author-text">SISPROT GLOBAL FIBER</p>
      </div>
      <PageNav />

      {/* Contenedor para los informes de Power BI con un diseño responsivo */}
      <div className="report-container">
        
        {/* Sección de Credenciales de Acceso */}
        <div className="access-credentials-card">
          <div className="credentials-header">
            <span style={{ fontSize: '1.5rem' }}>🔐</span>
            <h4>Credenciales de Acceso Corporativo</h4>
          </div>
          <div className="credential-item">
            <span className="credential-label">Usuario:</span>
            <span className="credential-value">ybravo@sisprotgf.com</span>
          </div>
          <div className="credential-item">
            <span className="credential-label">Contraseña:</span>
            <span className="credential-value">Qwerty#2501.</span>
          </div>
          <span className="access-note">
            * Use estos datos si el sistema solicita inicio de sesión para visualizar los tableros.
          </span>
        </div>

        {/* Aviso de Rotación para Móviles */}
        <div className="mobile-rotation-notice">
          <span className="notice-icon">📱🔄</span>
          <p className="notice-text">
            <strong>Tip de visualización:</strong> Para una mejor experiencia y ver los gráficos en detalle, te recomendamos colocar tu dispositivo en <strong>posición horizontal</strong>.
          </p>
        </div>

        {/* Slider de Reportes (Carrusel Horizontal) */}
        <div className="slider-wrapper">
          <button 
            className="slider-nav-btn prev" 
            onClick={() => document.getElementById('reports-slider').scrollBy({ left: -window.innerWidth * 0.8, behavior: 'smooth' })}
          >
            ❮
          </button>
          
          <div className="reports-slider" id="reports-slider">
            {/* Informe 1: Indicadores con API */}
            <div className="report-card">
              <h3 className="report-title">
                Dashboard SGF — Control Diario de Contratos (Estados, RS/PM y Montos)
              </h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Indicadores con API"
                  src="https://app.powerbi.com/reportEmbed?reportId=1064c211-8d6e-49b5-acae-975603e275a0&autoAuth=true&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>

            {/* Informe NUEVO: Control de Cancelaciones y Motivos */}
            <div className="report-card">
              <h3 className="report-title">Control de Cancelaciones y Motivos</h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Control de Cancelaciones y Motivos"
                  src="https://app.powerbi.com/reportEmbed?reportId=478a6da0-9adf-430e-a7ba-0200ee609cbe&autoAuth=true&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>

            {/* Informe NUEVO: Encuesta de Satisfacción */}
            <div className="report-card">
              <h3 className="report-title">Encuesta de Satisfacción</h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Encuesta de Satisfacción"
                  src="https://app.powerbi.com/reportEmbed?reportId=d33fc88a-e54a-4419-b7da-1842085483c9&pageName=f13b3b732a3cecbf2ef9&autoAuth=true&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>

            {/* Informe 2: Ingresos Diarios */}
            <div className="report-card">
              <h3 className="report-title">Ingresos Diarios</h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Ingresos diarios"
                  src="https://app.powerbi.com/reportEmbed?reportId=196d76cf-527d-4ca4-ac3b-f7a089c57d88&autoAuth=true&ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>

            {/* Informe 3: Activos por día */}
            <div className="report-card">
              <h3 className="report-title">Activos por Día</h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Activos por día"
                  src="https://app.powerbi.com/reportEmbed?reportId=a7a75bb0-7775-43b7-816e-30c792d9fe1d&autoAuth=true&ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>

            {/* Informe 4: Ventas Drive */}
            <div className="report-card">
              <h3 className="report-title">Ventas</h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Ventas Drive"
                  src="https://app.powerbi.com/reportEmbed?reportId=20ebdb0e-ea7f-4770-b73c-41e0a483e97c&autoAuth=true&ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>

            {/* Informe 5: Cambio de Plan */}
            <div className="report-card">
              <h3 className="report-title">Cambio de Plan</h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Cambio de Plan"
                  src="https://app.powerbi.com/reportEmbed?reportId=38edf0b8-c685-47e1-ac9a-028c722645cb&autoAuth=true&ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>

            {/* Informe NUEVO: Dashboard de Rendimiento: Pyme vs. Residencial */}
            <div className="report-card">
              <h3 className="report-title">Dashboard de Rendimiento — Pyme vs. Residencial</h3>
              <div className="iframe-wrapper">
                <iframe
                  title="Dashboard de Rendimiento: Pyme vs. Residencial"
                  src="https://app.powerbi.com/reportEmbed?reportId=bf9d8fb0-4fcc-467d-8cec-045d9a4b2c45&pageName=f527d7ab2d8601b15bd3&autoAuth=true&experience=power-bi"
                  frameBorder="0"
                  allowFullScreen={true}
                ></iframe>
              </div>
            </div>
          </div>

          <button 
            className="slider-nav-btn next" 
            onClick={() => document.getElementById('reports-slider').scrollBy({ left: window.innerWidth * 0.8, behavior: 'smooth' })}
          >
            ❯
          </button>
        </div>

      </div>

    </div>
  );
}

export default PageNotFound;
