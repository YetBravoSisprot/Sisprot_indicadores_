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
    e.preventDefault(); // 🚫 evita el refresh
    handleLoginClick(); // ✅ ejecuta tu login real
  };

  return (
    <main className="login-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
