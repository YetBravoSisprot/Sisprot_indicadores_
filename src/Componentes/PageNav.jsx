import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { PasswordContext } from "../PasswordContext/PasswordContext";
import "./PageNav.css";

function PageNav() {
  const { logout, email } = useContext(PasswordContext);
  const navigate = useNavigate();

  const [currentDateTime, setCurrentDateTime] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString());
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar menú al hacer clic en un link
  const handleLinkClick = () => setMenuOpen(false);

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    const hour = new Date().getHours();
    let timeGreeting = "día";
    if (hour >= 12 && hour < 19) timeGreeting = "tarde";
    else if (hour >= 19 || hour < 5) timeGreeting = "noche";

    const userNameMatch = email.match(/^([^@.]+)/);
    let rawUserName = userNameMatch ? userNameMatch[1] : "";
    rawUserName = rawUserName.replace(/[\d._]+$/, "").trim();
    const userName = rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1).toLowerCase();
    const nameToUse = userName ? ` ${userName}` : "";

    setLogoutMessage(`¡Gracias por su trabajo${nameToUse}! Que tenga feliz ${timeGreeting}.`);
    setShowLogoutModal(true);
  };

  const navLinks = [
    { to: "/TopUrbanismo", label: "Top Urbanismos" },
    { to: "/*", label: "Reportes BI" },
    { to: "/Indicadores", label: "Indicadores" },
    { to: "/Ventas", label: "Operaciones" },
    { to: "/VentasGlobales", label: "Ventas 2021-2026" },
    { to: "/Admin", label: "Adm. Ingresos" },
  ];

  return (
    <>
      <nav className="DisplayNotMax481px">
        {/* ===== MENÚ DESKTOP ===== */}
        <ul className="horizontal-list">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to}>{link.label}</NavLink>
            </li>
          ))}
          <li>
            <a href="#" className="logout-btn" onClick={handleLogoutClick}>
              Cerrar Sesión
            </a>
          </li>
        </ul>

        {/* Reloj en desktop */}
        <div className="datetime-display">
          <p>{currentDateTime}</p>
        </div>

        {/* ===== BOTÓN HAMBURGUESA (solo mobile) ===== */}
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* ===== MENÚ DESPLEGABLE MÓVIL ===== */}
        <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`}>
          <ul>
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} onClick={handleLinkClick}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <a href="#" className="logout-btn" onClick={handleLogoutClick}>
                Cerrar Sesión
              </a>
            </li>
          </ul>
          <div className="nav-mobile-datetime">{currentDateTime}</div>
        </div>
      </nav>

      {/* ===== MODAL DE CERRAR SESIÓN ===== */}
      {showLogoutModal && (
        <div className="custom-logout-modal-overlay">
          <div className="custom-logout-modal">
            <button
              className="modal-close-x"
              onClick={() => setShowLogoutModal(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="logout-modal-content">
              <h3>Cerrando Sesión...</h3>
              <p>{logoutMessage}</p>
              <button
                className="logout-modal-btn"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                  navigate("/");
                }}
              >
                Aceptar y Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PageNav;
