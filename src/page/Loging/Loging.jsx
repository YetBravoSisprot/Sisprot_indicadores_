import React, { useContext } from "react";

import LogingForm from "../../Componentes/LogingForm";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import DropdownMenu from "../../Componentes/DropdownMenu";

function Loging() {
  const { showPasswordState, isAuthenticated, role } =
    useContext(PasswordContext);

  // Usuario autenticado pero sin permisos
  if (!showPasswordState && isAuthenticated && role !== "admin" && role !== "ventas") {
    return (
      <div className="login-container">
        <div className="login-card">
          <LogoTitulo />
          <p className="login-error">No autorizado</p>
          <DropdownMenu />
          <LogingForm />
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      {showPasswordState ? (
        <div className="login-card">
          <LogoTitulo />
          <LogingForm />
        </div>
      ) : (
        <>
          <PageNav />
          <DropdownMenu />
        </>
      )}
    </div>
  );
}

export default Loging;
