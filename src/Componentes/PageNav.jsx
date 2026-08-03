import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { PasswordContext } from "../PasswordContext/PasswordContext";
import "./PageNav.css";

function PageNav() {
  const { logout, email, role } = useContext(PasswordContext);
  const navigate = useNavigate();

  const [currentDateTime, setCurrentDateTime] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleString());
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", isCollapsed);
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [isCollapsed]);

  const handleLinkClick = () => setMenuOpen(false);

  const userNameMatch = email ? email.match(/^([^@.]+)/) : null;
  let rawUserName = userNameMatch ? userNameMatch[1] : "";
  rawUserName = rawUserName.replace(/[\d._]+$/, "").trim();
  const userName = rawUserName ? rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1).toLowerCase() : "Usuario";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    const hour = new Date().getHours();
    let timeGreeting = "día";
    if (hour >= 12 && hour < 19) timeGreeting = "tarde";
    else if (hour >= 19 || hour < 5) timeGreeting = "noche";

    setLogoutMessage(`¡Gracias por su trabajo ${userName}! Que tenga feliz ${timeGreeting}.`);
    setShowLogoutModal(true);
  };

  const allNavLinks = [
    { to: "/TopUrbanismo", label: "Top Urbanismos", roles: ["admin"] },
    { to: "/*", label: "Reportes BI", roles: ["admin"] },
    { to: "/Indicadores", label: "Resumen BI", roles: ["admin"] },
    { to: "/Ventas", label: "Operaciones", roles: ["admin", "ventas"] },
    { to: "/VentasGlobales", label: "Ventas 2021-2026", roles: ["admin", "ventas"] },
    { to: "/Admin", label: "Adm. Ingresos", roles: ["admin"] },
    { to: "/Reactivados", label: "Control Reactivados", roles: ["admin", "analista_atencion"] },
  ];

  const navLinks = allNavLinks.filter((link) => !link.roles || link.roles.includes(role));

  const getIcon = (label) => {
    switch (label) {
      case "Top Urbanismos":
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        );
      case "Reportes BI":
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      case "Resumen BI":
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case "Operaciones":
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        );
      case "Ventas 2021-2026":
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        );
      case "Adm. Ingresos":
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      case "Control Reactivados":
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      default:
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Botón Hamburguesa Móvil */}
      <button
        className={`mobile-nav-hamburger ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menú de Navegación"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Barra de Fondo para Móvil (Header de soporte) */}
      <div className="mobile-nav-header">
        <img src="/logo-.png" alt="Sisprot Logo" className="mobile-header-logo" />
        <span className="mobile-header-title">Sisprot BI</span>
      </div>

      {/* Sidebar Principal */}
      <aside className={`sidebar-container ${isCollapsed ? "collapsed" : ""} ${menuOpen ? "mobile-open" : ""}`}>
        {/* Botón para colapsar en Desktop */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir menú" : "Contraer menú"}
          aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        {/* Marca / Logos */}
        <div className="sidebar-brand">
          <img src="/logo_sgf.png" alt="SGF Logo" className="sidebar-logo-sgf" />
          <div className="sidebar-brand-divider"></div>
          <div className="sidebar-logo-main-container">
            <img src="/logo-.png" alt="Sisprot Logo" className="sidebar-logo-main" />
            <span className="sidebar-brand-title">Sisprot BI</span>
          </div>
        </div>

        {/* Lista de Navegación */}
        <nav className="sidebar-nav">
          <ul className="sidebar-links-list">
            {navLinks.map((link) => (
              <li key={link.to} className="sidebar-link-item">
                <NavLink
                  to={link.to}
                  onClick={handleLinkClick}
                  className={({ isActive }) => `sidebar-link-btn ${isActive ? "active" : ""}`}
                  title={link.label}
                >
                  <span className="sidebar-link-icon">{getIcon(link.label)}</span>
                  <span className="sidebar-link-label">{link.label}</span>
                  <span className="sidebar-link-arrow">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Info de fecha y hora */}
        <div className="sidebar-datetime">
          <span className="datetime-clock-icon">🕒</span>
          <span>{currentDateTime}</span>
        </div>

        {/* Tarjeta de Perfil de Usuario en el fondo */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            <span>{userInitial}</span>
          </div>
          <div className="sidebar-user-info">
            <h4 className="sidebar-user-name">{userName}</h4>
            <p className="sidebar-user-email">{email || "usuario@sisprotgf.com"}</p>
          </div>
          <button 
            className="sidebar-logout-btn" 
            onClick={handleLogoutClick}
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Overlay de menú móvil */}
      {menuOpen && <div className="mobile-sidebar-overlay" onClick={() => setMenuOpen(false)}></div>}

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
