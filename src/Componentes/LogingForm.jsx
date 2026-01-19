import React, { useContext } from "react";
import "./LogingForm.css";
import { PasswordContext } from "../PasswordContext/PasswordContext";

function LogingForm() {
  const {
    setEmail,
    setPassword,
    email,
    password,
    handleLoginClick
  } = useContext(PasswordContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLoginClick();
  };

  return (
    <main className="login-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Usuario</label>
          <input
            type="text"              // 🔑 CAMBIO CLAVE
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Usuario"
            required
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
          />
        </div>

        <button className="login-button" type="submit">
          Ingresar
        </button>
      </form>
    </main>
  );
}

export default LogingForm;
