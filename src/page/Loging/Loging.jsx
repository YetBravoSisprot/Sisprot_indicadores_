import React, { useContext } from "react";
import LogingForm from "../../Componentes/LogingForm";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./Loging.css";

function Loging() {
  const { showPasswordState, isAuthenticated, role } =
    useContext(PasswordContext);

  if (!showPasswordState && isAuthenticated && role !== "admin" && role !== "ventas") {
    return (
      <div className="login-wrapper">
        <div className="login-card animate-in">
          <LogoTitulo />
          <p className="login-error">Acceso no autorizado</p>
          <DropdownMenu />
          <LogingForm />
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      {showPasswordState ? (
        <div className="login-card animate-in">
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
