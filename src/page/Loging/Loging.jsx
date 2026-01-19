import React, { useContext } from "react";
import "./Loging.css";

import LogingForm from "../../Componentes/LogingForm";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import DropdownMenu from "../../Componentes/DropdownMenu";

function Loging() {
  const { showPasswordState, isAuthenticated, role } =
    useContext(PasswordContext);

  // 🔐 Seguridad original (NO TOCADA)
  if (!showPasswordState) {
    if (isAuthenticated && role !== "admin" && role !== "ventas") {
      return (
        <div>
          No autorizado
          <DropdownMenu />
          <LogingForm />
        </div>
      );
    }
  }

  return (
    <div className="login-page">
      {showPasswordState ? (
        <div className="login-card">
          <LogoTitulo />
          <LogingForm />
        </div>
      ) : (
        <>
          <LogoTitulo />
          <PageNav />
          <DropdownMenu />
        </>
      )}
    </div>
  );
}

export default Loging;
