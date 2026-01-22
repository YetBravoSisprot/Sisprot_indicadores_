import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import DropdownMenu from "./../../Componentes/DropdownMenu";
import "./Admin.css"; // Asegúrate de incluir el archivo CSS correcto

function Admin() {
  const { showPasswordState, isLoading } = useContext(PasswordContext);
  
  // Aquí va tu lógica existente...
  
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

          <h3 className="h3">Vista en construcción</h3>
          
          {/* Aquí va tu contenido original */}
          
          {/* Mensaje de en construcción */}
          <div className="en-construccion">
            <h2>¡Esta sección está en construcción!</h2>
            <p>Estamos trabajando en la funcionalidad de administración. Vuelve pronto para más detalles.</p>
            <div className="icono-construccion">🚧</div>
          </div>
        </>
      )}
    </div>
  );
}

export default Admin;
