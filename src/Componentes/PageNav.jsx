import React, { useState, useEffect, useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { PasswordContext } from "../PasswordContext/PasswordContext";
import "./PageNav.css";

function PageNav() {
  const { logout, email } = useContext(PasswordContext);
  const navigate = useNavigate();

  // Estado para almacenar la hora y fecha actual
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");

  // Función para actualizar la hora y la fecha
  const updateDateTime = () => {
    const now = new Date();
    const formattedDate = now.toLocaleString(); // Formato por defecto de la fecha y hora
    setCurrentDateTime(formattedDate);
  };

  // useEffect para actualizar la fecha y hora cada segundo
  useEffect(() => {
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000); // Actualizar cada segundo

    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="nav , DisplayNotMax481px ">
      <ul className="horizontal-list">
        <li>
          <NavLink to="/TopUrbanismo">Top Urbanismos</NavLink>
        </li>
        <li>
          <NavLink to="/*">Indicadores</NavLink>
        </li>
        <li>
          <NavLink to="/Indicadores">Lista de Clientes</NavLink>
        </li>
        <li>
          <NavLink to="/Ventas">Operaciones</NavLink>
        </li>
        <li>
          <NavLink to="/VentasGlobales">Ventas 2021-2026</NavLink>
        </li>
        <li>
          <NavLink to="/Admin">Adm. Ingresos</NavLink>
        </li>
        <li>
          <a href="#" className="logout-btn" onClick={(e) => {
            e.preventDefault();
            const hour = new Date().getHours();
            let timeGreeting = "día";
            if (hour >= 12 && hour < 19) timeGreeting = "tarde";
            else if (hour >= 19 || hour < 5) timeGreeting = "noche";

            // Extract the user name logic (similar to Chatbot)
            const userNameMatch = email.match(/^([^@.]+)/);
            let rawUserName = userNameMatch ? userNameMatch[1] : "";
            rawUserName = rawUserName.replace(/[\d._]+$/, "").trim();
            const userName = rawUserName.charAt(0).toUpperCase() + rawUserName.slice(1).toLowerCase();
            const nameToUse = userName ? ` ${userName}` : "";

            setLogoutMessage(`¡Gracias por su trabajo${nameToUse}! Que tenga feliz ${timeGreeting}.`);
            setShowLogoutModal(true);
          }}>
            Cerrar Sesión
          </a>
        </li>
      </ul>

      {/* Mostrar la fecha y hora actual */}
      <div className="datetime-display">
        <p>{currentDateTime}</p> {/* Aquí se mostrará la fecha y hora */}
      </div>

      {/* MODAL DE CERRAR SESIÓN */}
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
    </nav>
  );
}

export default PageNav;
