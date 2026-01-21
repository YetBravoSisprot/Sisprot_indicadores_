import React from "react";
import "./DropdownMenu.css";
import { NavLink } from "react-router-dom";

function DropdownMenu() {
  return (
    <div className="dropdown-container">
      {/* Eliminamos el botón de menú ya que no lo necesitamos */}
      <ul className="dropdown-content">
        <li>
          <NavLink to="/TopUrbanismo" className="dropdown-link">
            Top Urbanismos
          </NavLink>
        </li>
        <li>
          <NavLink to="/Indicadores" className="dropdown-link">
            Lista de Clientes
          </NavLink>
        </li>
        <li>
          <NavLink to="/Ventas" className="dropdown-link">
            Operaciones
          </NavLink>
        </li>
        <li>
          <NavLink to="/*" className="dropdown-link">
            Equipo de Ventas
          </NavLink>
        </li>
        <li>
          <NavLink to="/Admin" className="dropdown-link">
            Adm. Ingresos
          </NavLink>
        </li>
      </ul>
    </div>
  );
}

export default DropdownMenu;
