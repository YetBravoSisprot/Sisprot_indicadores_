import React, { useState, useContext, useEffect } from "react";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import { useNavigate } from "react-router-dom";
import "./Loging.css";

function Loging() {
  const { login, isAuthenticated, role, error: contextError } = useContext(PasswordContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState(() => localStorage.getItem("savedUserEmail") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("rememberUser") === "true");
  const [error, setError] = useState("");

  const fondoPath = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/fondo_Sisprot_BI.png` : "/fondo_Sisprot_BI.png";
  const logoPath = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/logo_sgf.png` : "./logo_sgf.png";

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === "analista_atencion") {
        navigate("/Reactivados");
      } else if (role === "ventas") {
        navigate("/Ventas");
      } else {
        navigate("/TopUrbanismo");
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username.trim() && !password.trim()) {
      setError("Por favor, ingresa tu usuario y contraseña.");
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

    if (rememberMe) {
      localStorage.setItem("rememberUser", "true");
      localStorage.setItem("savedUserEmail", username.trim());
    } else {
      localStorage.removeItem("rememberUser");
      localStorage.removeItem("savedUserEmail");
    }

    setError("");
    login(username.trim(), password);
  };

  const activeError = error || contextError;

  return (
    <div
      className="login-page-bg"
      style={{ backgroundImage: `url(${fondoPath})` }}
    >
      <div className="login-main-container">
        {/* Encabezado Superior con Logo y Título */}
        <header className="login-header animate-fade-in">
          <div className="login-brand-row">
            <img
              src={logoPath}
              alt="SGF"
              className="login-sgf-logo"
            />
            <div className="login-brand-divider" />
            <span className="login-brand-title">Sisprot BI</span>
          </div>
          <p className="login-brand-subtitle">Portal de inteligencia de negocios</p>
        </header>

        {/* Tarjeta de Inicio de Sesión con Reflejo Inferior */}
        <div className="login-card-glow-wrapper animate-slide-up">
          <div className="login-card-modern">
            <form className="login-form-content" onSubmit={handleSubmit}>
              {/* Alerta de Error */}
              {activeError && (
                <div className="login-alert-error">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{activeError}</span>
                </div>
              )}

              {/* Campo Usuario */}
              <div className="login-field-group">
                <label htmlFor="username-input" className="login-field-label">
                  Usuario
                </label>
                <div className={`login-input-box ${activeError && !username.trim() ? "has-error" : ""}`}>
                  <span className="login-field-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="username-input"
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-field-input"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div className="login-field-group">
                <label htmlFor="password-input" className="login-field-label">
                  Contraseña
                </label>
                <div className={`login-input-box ${activeError && !password.trim() ? "has-error" : ""}`}>
                  <span className="login-field-icon">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-field-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-toggle-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Fila Recordarme */}
              <div className="login-checkbox-row">
                <label className="login-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="login-checkbox-native"
                  />
                  <span className="login-checkbox-text">Recordarme</span>
                </label>
              </div>

              {/* Botón Iniciar sesión */}
              <button type="submit" className="login-action-btn">
                <span>Iniciar sesión</span>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              {/* Acceso seguro • SGF */}
              <div className="login-secure-footer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Acceso seguro • SGF</span>
              </div>
            </form>
          </div>
        </div>

        {/* Pie de Página */}
        <footer className="login-bottom-footer animate-fade-in">
          <div className="login-footer-separator" />
          <span className="login-footer-copy">
            Sisprot BI · Sistema de gestión de información
          </span>
          <div className="login-footer-separator" />
        </footer>
      </div>
    </div>
  );
}

export default Loging;
