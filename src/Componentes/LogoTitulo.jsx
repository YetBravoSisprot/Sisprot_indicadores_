import React from "react";
import "./LogoTitulo.css";

const LogoTitulo = ({ variant = "default" }) => {
  return (
    <div className={`logo-wrapper ${variant}`}>
      <img
        src="/logo_sgf.png"
        alt="Sisprot Global Fiber"
        className="logo-img"
      />

      <div className="logo-text">
        <h1>Sisprot Global Fiber</h1>
        <span>App</span>
      </div>
    </div>
  );
};

export default LogoTitulo;
