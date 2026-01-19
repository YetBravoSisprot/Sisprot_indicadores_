import React from "react";
import "./LogoTitulo.css";

const LogoTitulo = ({ variant = "default" }) => {
  return (
    <div className={`logo-wrapper ${variant}`}>
      <div className="logo-content">
        <img
          src="/logo_sgf.png"
          alt="Sisprot Global Fiber"
          className="logo-image"
        />
        <h1 className="logo-title">Sisprot Global Fiber</h1>
        <span className="logo-subtitle">App</span>
      </div>
    </div>
  );
};

export default LogoTitulo;
