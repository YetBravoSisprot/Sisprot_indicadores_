import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "./PageNav.css";

function PageNav() {
  // Estado para almacenar la hora y fecha actual
  const [currentDateTime, setCurrentDateTime] = useState("");

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
          <NavLink to="/Admin">Adm. Ingresos</NavLink>
        </li>
      </ul>

      {/* Mostrar la fecha y hora actual */}
      <div className="datetime-display">
        <p>{currentDateTime}</p> {/* Aquí se mostrará la fecha y hora */}
      </div>
    </nav>
  );
}

export default PageNav;
