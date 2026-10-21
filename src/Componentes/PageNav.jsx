import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { PasswordContext } from "../PasswordContext/PasswordContext";
import "./PageNav.css";

function PageNav() {
  const { logout, email, role } = useContext(PasswordContext);
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }));
      setCurrentTime(now.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }));
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
          <svg className="menu-icon-svg icon-blue" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="15" x2="15" y2="21" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="15" y1="3" x2="15" y2="9" />
          </svg>
        );
      case "Reportes BI":
        return (
          <svg className="menu-icon-svg icon-cyan" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <line x1="6" y1="20" x2="6" y2="12" />
            <line x1="12" y1="20" x2="12" y2="6" />
            <line x1="18" y1="20" x2="18" y2="9" />
          </svg>
        );
      case "Resumen BI":
        return (
          <svg className="menu-icon-svg icon-sky" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5l9-7.5 9 7.5v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z" />
            <polyline points="9 21 9 12 15 12 15 21" />
          </svg>
        );
      case "Operaciones":
        return (
          <svg className="menu-icon-svg icon-screen" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2.5" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        );
      case "Ventas 2021-2026":
        return (
          <svg className="menu-icon-svg icon-green" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1.5" x2="12" y2="22.5" />
            <path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        );
      case "Adm. Ingresos":
        return (
          <svg className="menu-icon-svg icon-purple" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="11" rx="2.5" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      case "Control Reactivados":
        return (
          <svg className="menu-icon-svg icon-orange" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <circle cx="18" cy="15" r="2.5" />
            <path d="M18 11.5v1M18 17.5v1M15.5 15h-1M21.5 15h-1" />
          </svg>
        );
      default:
        return (
          <svg className="menu-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="sidebar-brand-box">
            <div className="brand-badge-squircle">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <rect x="3.5" y="14.5" width="3" height="5.5" rx="1" fill="#0284c7" />
                <rect x="8" y="11.5" width="3" height="8.5" rx="1" fill="#0284c7" />
                <rect x="12.5" y="8.5" width="3" height="11.5" rx="1" fill="#0284c7" />
                <rect x="17" y="5.5" width="3" height="14.5" rx="1" fill="#0284c7" />
                <path d="M3.5 15L8.5 9.5L13.5 12.5L19.5 4.5" stroke="#0077b6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="15.5 4.5 19.5 4.5 19.5 8.5" stroke="#0077b6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="brand-badge-texts">
              <span className="brand-badge-title">Sisprot <span className="brand-badge-highlight">BI</span></span>
            </div>
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
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Info de fecha y hora */}
        <div className="sidebar-datetime-card">
          <div className="datetime-clock-wrap">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#00d2ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="datetime-text-col">
            <span className="datetime-date-val">{currentDate}</span>
            <span className="datetime-time-val">{currentTime}</span>
          </div>
        </div>

        {/* Tarjeta de Perfil de Usuario en el fondo */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            <span>{userInitial}</span>
          </div>
          <div className="sidebar-user-info">
            <h4 className="sidebar-user-name">{userName}</h4>
            <p className="sidebar-user-handle">{rawUserName ? rawUserName.toLowerCase() : "usuario"}</p>
          </div>
          <button 
            className="sidebar-logout-btn" 
            onClick={handleLogoutClick}
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
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
