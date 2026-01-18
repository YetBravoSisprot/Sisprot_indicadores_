import React, { useState, useEffect } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./ventas.css";

function Ventas() {
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [topUrbanismos, setTopUrbanismos] = useState([]);

  useEffect(() => {
    const dataMock = [
      { urbanismo: "Sector A", clientes: 10, ingresos: 200 },
      { urbanismo: "Sector B", clientes: 5, ingresos: 120 },
    ];

    setTopUrbanismos(dataMock);
    setTotalClientesGlobal(dataMock.reduce((a, b) => a + b.clientes, 0));
    setTotalIngresos(dataMock.reduce((a, b) => a + b.ingresos, 0));
  }, []);

  return (
    <div>
      <LogoTitulo />
      <DropdownMenu />
      <PageNav />

      <button>Total Clientes: {totalClientesGlobal}</button>
      <button>Total Ingresos: {totalIngresos}$</button>

      <ul>
        {topUrbanismos.map((u, i) => (
          <li key={i}>
            {u.urbanismo} — {u.clientes} clientes — {u.ingresos}$
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Ventas;
