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
        <iframe 
          title="Indicadores con API"
          width="100%" 
          height="600" 
          src="https://app.powerbi.com/groups/me/reports/053e174b-9772-43d6-bd34-8e2e2464fce5/d020d82090c61e3905ae?ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
          frameBorder="0" 
          allowFullScreen={true}
          style={{marginBottom: '20px'}}
        ></iframe>

        {/* Informe 2: Ingresos Diarios */}
        <iframe 
          title="Ingresos diarios" // El primer informe original
          width="100%" 
          height="600" 
          src="https://app.powerbi.com/groups/me/reports/196d76cf-527d-4ca4-ac3b-f7a089c57d88/b52889aa63e70259926e?ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
          frameBorder="0" 
          allowFullScreen={true}
          style={{marginBottom: '20px'}}
        ></iframe>
        
        {/* Informe 3: Activos por día */}
        <iframe 
          title="Activos por día" // El segundo informe original
          width="100%" 
          height="600" 
          src="https://app.powerbi.com/groups/me/reports/a7a75bb0-7775-43b7-816e-30c792d9fe1d/556eab539e42c5888fa2?ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
          frameBorder="0" 
          allowFullScreen={true}
        ></iframe>

        {/* Informe 4: Ventas Drive */}
        <iframe 
          title="Ventas Drive" 
          width="100%" 
          height="600"
          src="https://app.powerbi.com/groups/me/reports/20ebdb0e-ea7f-4770-b73c-41e0a483e97c/da93fbe7904c9096b4d4?ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
          frameBorder="0" 
          allowFullScreen={true}
          style={{marginBottom: '20px'}}
        ></iframe>

        {/* Informe 5: Cambio de Plan */}
        <iframe 
          title="Cambio de Plan"
          width="100%" 
          height="600" 
          src="https://app.powerbi.com/groups/me/reports/38edf0b8-c685-47e1-ac9a-028c722645cb/dbbaccb0c9339d9a957e?ctid=f4c24cea-686c-4674-8805-f12b558b2133&experience=power-bi"
          frameBorder="0"
          allowFullScreen={true}
          style={{marginBottom: '20px'}}
        ></iframe>
      </div>
    </div>
  );
}

export default PageNotFound;
