import React, { useContext } from "react";
import "./LogingForm.css";
import { PasswordContext } from "../PasswordContext/PasswordContext";

function LogingForm() {
  const {
    setEmail,
    setPassword,
    email,
    password,
    handleLoginClick,
  } = useContext(PasswordContext);

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Bienvenido</h2>
        <p className="login-subtitle">
          Accede al sistema de Sisprot Global Fiber
        </p>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleLoginClick();
          }}
        >
          <div className="input-group">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label>Email</label>
          </div>

          <div className="input-group">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label>Contraseña</label>
          </div>

          <button type="submit" className="login-button">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}

export default LogingForm;
