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
        {/* Informe 1: Indicadores con API */}
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

        {/* Informe NUEVO: Control de Cancelaciones y Motivos */}
        <h3 className="report-title">Control de Cancelaciones y Motivos</h3>
        <div className="iframe-wrapper">
          <iframe
            title="Control de Cancelaciones y Motivos"
            src="https://app.powerbi.com/reportEmbed?reportId=478a6da0-9adf-430e-a7ba-0200ee609cbe&autoAuth=true&experience=power-bi"
            frameBorder="0"
            allowFullScreen={true}
          ></iframe>
        </div>

        {/* Informe 2: Ingresos Diarios */}
        <h3 className="report-title">Ingresos Diarios</h3>
        <div className="iframe-wrapper">
          <iframe
            title="Ingresos diarios"
            src="https://app.powerbi.com/reportEmbed?reportId=196d76cf-527d-4ca4-ac3b-f7a089c57d88&autoAuth=true&ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
            frameBorder="0"
            allowFullScreen={true}
          ></iframe>
        </div>

        {/* Informe 3: Activos por día */}
        <h3 className="report-title">Activos por Día</h3>
        <div className="iframe-wrapper">
          <iframe
            title="Activos por día"
            src="https://app.powerbi.com/reportEmbed?reportId=a7a75bb0-7775-43b7-816e-30c792d9fe1d&autoAuth=true&ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
            frameBorder="0"
            allowFullScreen={true}
          ></iframe>
        </div>

        {/* Informe 4: Ventas Drive */}
        <h3 className="report-title">Ventas</h3>
        <div className="iframe-wrapper">
          <iframe
            title="Ventas Drive"
            src="https://app.powerbi.com/reportEmbed?reportId=20ebdb0e-ea7f-4770-b73c-41e0a483e97c&autoAuth=true&ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
            frameBorder="0"
            allowFullScreen={true}
          ></iframe>
        </div>

        {/* Informe 5: Cambio de Plan */}
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
    </div>
  );
}

export default PageNotFound;
