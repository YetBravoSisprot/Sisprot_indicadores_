import React, { useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import { PasswordContext } from "../../PasswordContext/PasswordContext"; 
import LogingForm from "../../Componentes/LogingForm"; 
import "./ventas.css"; 

function Ventas() {
  const { showPasswordState } = useContext(PasswordContext);

  return (
    <div>
      {showPasswordState ? (
        <>
          <h1>Inicia Sesión</h1>
          <LogingForm />
        </>
      ) : (
        <>
          <LogoTitulo />
          <DropdownMenu />
          <PageNav />

          {/* Sección en construcción */}
          <div className="en-construccion">
            <h2>¡Esta sección está en construcción!</h2>
            <p>Estamos trabajando en la funcionalidad de operaciones. Vuelve pronto para más detalles.</p>
            <div className="icono-construccion">🚧</div>
          </div>
        </>
      )}
    </div>
  );
}

export default Ventas;
