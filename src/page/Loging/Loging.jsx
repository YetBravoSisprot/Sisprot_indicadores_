import React, { useContext } from "react";
import "./Loging.css";

import LogingForm from "../../Componentes/LogingForm";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";

function Loging() {
  const { showPasswordState, isAuthenticated, role } =
    useContext(PasswordContext);

  // Seguridad básica (NO TOCAR)
  if (!showPasswordState) {
    if (isAuthenticated && role !== "admin" && role !== "ventas") {
      return <div>No autorizado</div>;
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <LogoTitulo />
        <LogingForm />
      </div>
    </div>
  );
}

export default Loging;
