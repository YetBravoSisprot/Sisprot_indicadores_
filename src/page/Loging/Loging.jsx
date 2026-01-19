import React, { useContext } from "react";
import { PasswordContext } from "../../PasswordContext/PasswordContext";

import LogingForm from "../../Componentes/LogingForm";
import LogoTitulo from "../../Componentes/LogoTitulo";
import PageNav from "../../Componentes/PageNav";
import DropdownMenu from "../../Componentes/DropdownMenu";

import "./Loging.css";

function Loging() {
  const { showPasswordState, isAuthenticated, role } =
    useContext(PasswordContext);

  // 🔐 Usuario autenticado pero sin permisos
  if (!showPasswordState && isAuthenticated && role !== "admin" && role !== "ventas") {
    return (
      <div className="auth-layout">
        <div className="auth-card animate-enter">
          <LogoTitulo />
          <p className="auth-error">Acceso no autorizado</p>
          <DropdownMenu />
          <LogingForm />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      {showPasswordState ? (
        <div className="auth-card animate-enter">
          <LogoTitulo />
          <p className="auth-subtitle">
            Acceso interno · Sisprot Global Fiber
          </p>
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
