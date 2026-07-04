import React, { useState, useContext, useEffect } from "react";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import { useNavigate } from "react-router-dom";
import LogoTitulo from "../../Componentes/LogoTitulo";
import "./Loging.css";

function Loging() {
  const { login, isAuthenticated } = useContext(PasswordContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/TopUrbanismo");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // 🔐 Validación mejorada
    if (!username.trim() && !password.trim()) {
      setError("Por favor, ingrese su usuario y contraseña.");
      return;
    }
    if (!username.trim()) {
      setError("El campo 'Usuario' no puede estar vacío.");
      return;
    }
    if (!password.trim()) {
      setError("El campo 'Contraseña' no puede estar vacío.");
      return;
    }

    setError("");
    login(username, password);
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        <LogoTitulo />

        <div className="login-card">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={error && !username.trim() ? "input-error" : ""}
              />
            </div>

            <div className="input-group password-container">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error && !password.trim() ? "input-error" : ""}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <div className="error-container">
                <span className="error-icon">⚠️</span>
                <p className="error-message">{error}</p>
              </div>
            )}

            <button type="submit" className="login-button">
              Entrar al Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Loging;
