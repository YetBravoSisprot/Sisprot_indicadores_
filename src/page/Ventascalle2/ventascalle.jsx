import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./ventascalle.css";

function Ventascalle() {
  const { showPasswordState, data, isLoading, error } =
    useContext(PasswordContext);

  const [topUrb, setTopUrb] = useState([0, 3500]);
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(["Anual"]);
  const [vendedores, setVendedores] = useState(["Vendedores/Todos"]);

  const [ventasDelAnoActual, setVentasDelAnoActual] = useState([]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [sumatoriaPrecios, setSumatoriaPrecios] = useState(0);

  useEffect(() => {
    if (!data) return;

    const ultimoDiaDelMes = (año, mes) => new Date(año, mes + 1, 0);

    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth();

    const fechasMes = [
      { mes: 0, nombre: "Enero" },
      { mes: 1, nombre: "Febrero" },
      { mes: 2, nombre: "Marzo" },
      { mes: 3, nombre: "Abril" },
      { mes: 4, nombre: "Mayo" },
      { mes: 5, nombre: "Junio" },
      { mes: 6, nombre: "Julio" },
    ];

    const filtroFechas = fechasMes.map(({ mes, nombre }) => ({
      nombre,
      inicio: new Date(añoActual, mes, 1),
      fin: ultimoDiaDelMes(añoActual, mes),
    }));

    const primerDiaAñoActual = new Date(añoActual, 0, 1);
    const ultimoDiaAñoActual = new Date(añoActual, 11, 31);
    const primerDiaAñoPasado = new Date(añoActual - 1, 0, 1);
    const ultimoDiaAñoPasado = new Date(añoActual - 1, 11, 31);
    const primerDiaDelMes = new Date(añoActual, mesActual, 1);
    const ultimoDiaDelMesActual = ultimoDiaDelMes(añoActual, mesActual);

    const vendedoresPermitidos = [
      "Juan",
      "Barbara",
      "Eduardo",
      "Ysvet",
      "Nelsy",
      "Alejandro",
      "Cesar",
      "Hermary",
    ];

    const ventasFiltradas = data.results.filter((venta) => {
      if (
        venta.id_servicio === 3219 ||
        venta.id_servicio === 3218 ||
        venta.id_servicio === 3226
      ) {
        return false;
      }

      const fechaInstalacionStr = venta.fecha_instalacion;
      if (!fechaInstalacionStr) return false;

      const [fecha, hora] = fechaInstalacionStr.split(" ");
      const [dia, mes, año] = fecha.split("/");
      const ventaFecha = new Date(
        año,
        mes - 1,
        dia,
        ...hora.split(":")
      );

      const filtroAnualActual =
        estadosSeleccionados.includes("Anual") &&
        ventaFecha >= primerDiaAñoActual &&
        ventaFecha <= ultimoDiaAñoActual;

      const filtroAnualPasado =
        estadosSeleccionados.includes("Año Pasado") &&
        ventaFecha >= primerDiaAñoPasado &&
        ventaFecha <= ultimoDiaAñoPasado;

      const filtroMensual =
        estadosSeleccionados.includes("Mensual") &&
        ventaFecha >= primerDiaDelMes &&
        ventaFecha <= ultimoDiaDelMesActual;

      const filtroMeses = filtroFechas.some(
        ({ nombre, inicio, fin }) =>
          estadosSeleccionados.includes(nombre) &&
          ventaFecha >= inicio &&
          ventaFecha <= fin
      );

      const vendedorFiltrado = vendedores.includes("Vendedores/Todos")
        ? vendedoresPermitidos.includes(venta.usuario_router_wifi)
        : vendedores.includes(venta.usuario_router_wifi);

      return (
        (filtroAnualActual ||
          filtroAnualPasado ||
          filtroMensual ||
          filtroMeses) &&
        vendedorFiltrado
      );
    });

    const agrupado = ventasFiltradas.reduce((acc, curr) => {
      if (!curr.localidad) return acc;

      if (!acc[curr.localidad]) {
        acc[curr.localidad] = {
          cantidadClientes: 1,
          costodeinstalacionTotales:
            parseFloat(curr.costo_instalacion) || 0,
          costodePlanesTotales: parseFloat(curr.precio_plan) || 0,
        };
      } else {
        acc[curr.localidad].cantidadClientes += 1;
        acc[curr.localidad].costodeinstalacionTotales +=
          parseFloat(curr.costo_instalacion) || 0;
        acc[curr.localidad].costodePlanesTotales +=
          parseFloat(curr.precio_plan) || 0;
      }
      return acc;
    }, {});

    const urbanismosArray = Object.keys(agrupado).map((localidad) => ({
      urbanismo: localidad,
      ...agrupado[localidad],
    }));

    urbanismosArray.sort(
      (a, b) => b.cantidadClientes - a.cantidadClientes
    );

    const topCalculado = urbanismosArray.slice(...topUrb);

    setVentasDelAnoActual(topCalculado);

    setTotalIngresos(
      urbanismosArray.reduce(
        (acc, curr) => acc + curr.costodeinstalacionTotales,
        0
      )
    );

    setTotalClientesGlobal(
      urbanismosArray.reduce(
        (acc, curr) => acc + curr.cantidadClientes,
        0
      )
    );

    setSumatoriaPrecios(
      urbanismosArray.reduce(
        (acc, curr) => acc + curr.costodePlanesTotales,
        0
      )
    );
  }, [data, topUrb, estadosSeleccionados, vendedores]);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="ventas-container">
      <LogoTitulo />

      {showPasswordState ? (
        <div className="login-section">
          <h1>Inicia Sesión</h1>
          <LogingForm />
        </div>
      ) : (
        <div className="ventas-content">
          <DropdownMenu />
          <PageNav />

          <div className="selectors-container">
            <select
              size="5"
              multiple
              value={estadosSeleccionados}
              onChange={(e) =>
                setEstadosSeleccionados(
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
              className="estado-select"
            >
              <option value="Anual">Ventas del año</option>
              <option value="Mayo">Mayo</option>
              <option value="Junio">Junio</option>
              <option value="Julio">Julio</option>
            </select>

            <select
              size="5"
              multiple
              value={vendedores}
              onChange={(e) =>
                setVendedores(
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
              className="estado-select"
            >
              <option value="Vendedores/Todos">Vendedores/Todos</option>
              <option value="Juan">Juan</option>
              <option value="Barbara">Barbara</option>
              <option value="Eduardo">Eduardo</option>
              <option value="Ysvet">Ysvet</option>
              <option value="Nelsy">Nelsy</option>
              <option value="Alejandro">Alejandro</option>
              <option value="Cesar">Cesar</option>
              <option value="Hermary">Hermary</option>
            </select>
          </div>

          <div className="buttons-container">
            <button className="buttonIngreso">
              Total de Ventas: {totalClientesGlobal}
            </button>

            <button className="buttonIngreso marginbutton">
              Ingresos Recurrentes:{" "}
              {sumatoriaPrecios.toLocaleString("es-ES", {
                minimumFractionDigits: 2,
              })}
              $
            </button>

            <button className="buttonIngreso marginbutton">
              Ingresos por instalación:{" "}
              {totalIngresos.toLocaleString("es-ES", {
                minimumFractionDigits: 2,
              })}
              $
            </button>
          </div>

          <UrbanismoList urbanismos={ventasDelAnoActual} />
        </div>
      )}
    </div>
  );
}

function UrbanismoList({ urbanismos }) {
  const ordenados = [...urbanismos].sort(
    (a, b) => b.costodeinstalacionTotales - a.costodeinstalacionTotales
  );

  return (
    <ul className="urbanismo-list">
      {ordenados.map((u, index) => (
        <li key={index} className="urbanismo-item encabezados contenedor">
          <strong>
            {index + 1} - {u.urbanismo}
          </strong>
          <br />
          <span>Cantidad de Ventas: {u.cantidadClientes}</span>
          <br />
          <span>
            Ingreso Instalación:{" "}
            {isNaN(u.costodeinstalacionTotales)
              ? "No disponible"
              : Math.round(u.costodeinstalacionTotales)}
            $
          </span>
          <br />
          <span>
            Ingreso Recurrente:{" "}
            {isNaN(u.costodePlanesTotales)
              ? "No disponible"
              : u.costodePlanesTotales.toFixed(2)}
            $
          </span>
        </li>
      ))}
    </ul>
  );
}

export default Ventascalle;
