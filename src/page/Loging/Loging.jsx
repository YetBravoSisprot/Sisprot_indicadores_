import React, { useState, useContext, useEffect } from "react";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import { useNavigate } from "react-router-dom";
import LogoTitulo from "../../Componentes/LogoTitulo";
import ParticleBackground from "../../Componentes/ParticleBackground";
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
      <ParticleBackground />
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
                {showPassword ? "🙈" : "👁️"}
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