import React, { useContext, useState } from "react";
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

  const [showPassword, setShowPassword] = useState(false);

  return (
    <form className="login-form" onSubmit={(e) => e.preventDefault()}>
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          placeholder="usuario@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Contraseña</label>

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            aria-label="Mostrar / ocultar contraseña"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      <button className="login-button" onClick={handleLoginClick}>
        Ingresar
      </button>
    </form>
  );
}

export default LogingForm;
