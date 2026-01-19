import React, { useContext } from "react";
import "./LogingForm.css";
import { PasswordContext } from "../PasswordContext/PasswordContext";

function LogingForm() {
  const { setEmail, setPassword, email, password, handleLoginClick } =
    useContext(PasswordContext);

  return (
    <form className="login-form">
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

      <button type="submit" onClick={handleLoginClick}>
        Ingresar
      </button>
    </form>
  );
}

export default LogingForm;
