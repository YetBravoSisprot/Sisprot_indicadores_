import React, { useContext } from "react";
import "./DropdownMenu.css";
import { NavLink } from "react-router-dom";
import { PasswordContext } from "../PasswordContext/PasswordContext";

function DropdownMenu() {
  const { role } = useContext(PasswordContext);

  const links = [
    { to: "/TopUrbanismo", label: "Top Urbanismos", roles: ["admin"] },
    { to: "/*", label: "Reportes BI", roles: ["admin"] },
    { to: "/Indicadores", label: "Indicadores", roles: ["admin"] },
    { to: "/Ventas", label: "Operaciones", roles: ["admin", "ventas"] },
    { to: "/Admin", label: "Adm. Ingresos", roles: ["admin"] },
    { to: "/Reactivados", label: "Control Reactivados", roles: ["admin", "analista_atencion"] },
    { to: "/Encuestas", label: "Encuestas", roles: ["admin", "analista_atencion"] },
  ];

  const filteredLinks = links.filter((link) => !link.roles || link.roles.includes(role));

  return (
    <div className="dropdown-container">
      {/* Eliminamos el botón de menú ya que no lo necesitamos */}
      <ul className="dropdown-content">
        {filteredLinks.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} className="dropdown-link">
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DropdownMenu;
