import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import DropdownMenu from "../../Componentes/DropdownMenu";
import "./ventascalle.css";

function Ventascalle() {
  const { showPasswordState, data, isLoading, error } = useContext(PasswordContext);

  // 👉 SOLO lo que realmente se usa
  const [TopUrb] = useState([0, 3500]);
  const [estadosSeleccionados] = useState(["Anual"]);
  const [Vendedores] = useState(["Vendedores/Todos"]);

  const [Ventasdelanoactual, setVentasdelanoactual] = useState([]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalClientesGlobal, setTotalClientesGlobal] = useState(0);
  const [sumatoriaPrecios, setSumatoriaPrecios] = useState(0);

  useEffect(() => {
    if (!data) return;

    function ultimoDiaDelMes(año, mes) {
      return new Date(año, mes + 1, 0);
    }

    const fechaActual = new Date();
    const añoActual = fechaActual.getFullYear();

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

    const vendedoresPermitidos = [
      "Juan", "Barbara", "Eduardo", "Ysvet",
      "Nelsy", "Alejandro", "Cesar", "Hermary"
    ];

    const ventasFiltradas = data.results.filter((venta) => {
      if (!venta.fecha_instalacion) return false;

      const [fecha, hora] = venta.fecha_instalacion.split(" ");
      const [dia, mes, año] = fecha.split("/");
      const ventaFecha = new Date(año, mes - 1, dia, ...hora.split(":"));

      if ([3219, 3218, 3226].includes(venta.id_servicio)) return false;

      const filtroAnual =
        estadosSeleccionados.includes("Anual") &&
        ventaFecha >= primerDiaAñoActual &&
        ventaFecha <= ultimoDiaAñoActual;

      const filtroMeses = filtroFechas.some(
        ({ nombre, inicio, fin }) =>
          estadosSeleccionados.includes(nombre) &&
          ventaFecha >= inicio &&
          ventaFecha <= fin
      );

      const vendedorValido = Vendedores.includes("Vendedores/Todos")
        ? vendedoresPermitidos.includes(venta.usuario_router_wifi)
        : Vendedores.includes(venta.usuario_router_wifi);

      return (filtroAnual || filtroMeses) && vendedorValido;
    });

    const agrupado = ventasFiltradas.reduce((acc, curr) => {
      if (!acc[curr.localidad]) {
        acc[curr.localidad] = {
          cantidadClientes: 1,
          instalacion: Number(curr.costo_instalacion) || 0,
          recurrente: Number(curr.precio_plan) || 0,
        };
      } else {
        acc[curr.localidad].cantidadClientes++;
        acc[curr.localidad].instalacion += Number(curr.costo_instalacion) || 0;
        acc[curr.localidad].recurrente += Number(curr.precio_plan) || 0;
      }
      return acc;
    }, {});

    const urbanismos = Object.keys(agrupado)
      .map((key) => ({ urbanismo: key, ...agrupado[key] }))
      .sort((a, b) => b.cantidadClientes - a.cantidadClientes)
      .slice(TopUrb[0], TopUrb[1]);

    setVentasdelanoactual(urbanismos);
    setTotalClientesGlobal(urbanismos.reduce((a, b) => a + b.cantidadClientes, 0));
    setTotalIngresos(urbanismos.reduce((a, b) => a + b.instalacion, 0));
    setSumatoriaPrecios(urbanismos.reduce((a, b) => a + b.recurrente, 0));
  }, [data, TopUrb, estadosSeleccionados, Vendedores]);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="ventas-container">
      <LogoTitulo />
      {showPasswordState ? (
        <LogingForm />
      ) : (
        <>
          <DropdownMenu />
          <PageNav />

          <button>Total Ventas: {totalClientesGlobal}</button>
          <button>Ingreso Recurrente: {sumatoriaPrecios.toFixed(2)}$</button>
          <button>Ingreso Instalación: {totalIngresos.toFixed(2)}$</button>

          <ul>
            {Ventasdelanoactual.map((u, i) => (
              <li key={i}>
                <strong>{i + 1}. {u.urbanismo}</strong><br />
                Ventas: {u.cantidadClientes}<br />
                Instalación: {u.instalacion}$<br />
                Recurrente: {u.recurrente.toFixed(2)}$
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default Ventascalle;
