import React from "react";
import "./LogoTitulo.css";

const LogoTitulo = ({ variant }) => {
  return (
    <div className={`logo-wrapper ${variant === "login" ? "login" : ""}`}>
      <img src="/logo_sgf.png" alt="Sisprot Global Fiber" />
      <h1>Sisprot Global Fiber</h1>
      <span>App</span>
    </div>
  );
};

export default LogoTitulo;
