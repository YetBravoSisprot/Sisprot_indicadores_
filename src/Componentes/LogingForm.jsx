import React, { useContext, useState } from 'react';
import "./LogingForm.css";
import { PasswordContext } from '../PasswordContext/PasswordContext';

function LogingForm() {
  const { setEmail, setPassword, email, password, handleLoginClick } =
    useContext(PasswordContext);

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <main className="login-form">
        <form>
          <div className="form-group">
            <label htmlFor="email">Usuario</label>
            <input
              type="email"   /* 🔴 se mantiene EXACTAMENTE igual */
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              placeholder="Usuario"
            />
          </div>

          <div className="form-group password-group">
            <label htmlFor="password">Contraseña</label>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                placeholder="Contraseña"
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <button
              className="login-button"
              type="submit"
              onClick={handleLoginClick}
            >
              Entrar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default LogingForm;
