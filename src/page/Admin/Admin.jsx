import React, { useState, useEffect, useContext } from "react";
import PageNav from "../../Componentes/PageNav";
import LogoTitulo from "../../Componentes/LogoTitulo";
import { PasswordContext } from "../../PasswordContext/PasswordContext";
import LogingForm from "../../Componentes/LogingForm";
import DropdownMenu from "../../Componentes/DropdownMenu"; // Asegúrate de que el camino de importación sea correcto
import "./Admin.css"; // Archivo CSS para los estilos específicos de este componente

function Admin() {
  const { showPasswordState, isLoading } = useContext(PasswordContext);
  
  const [cajeroSeleccionado, setcajeroSeleccionado] = useState([
    "Jose Gonzalez",
    "georgina baladi",
    "Marlys Rodriguez",
    "Paola Guanipa",
  ]);

  const [fechaSeleccionada, setfechaSeleccionada] = useState(["Hoy"]);
  const [totalEfectivoPorCajero, setTotalEfectivoPorCajero] = useState({});
  const [ingresosPorCajero, setIngresosPorCajero] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("https://api-efectivo-f.vercel.app/");
        if (!response.ok) {
          throw new Error("Error al obtener los datos");
        }
        const data = await response.json();
        setIngresosPorCajero(data.results);
      } catch (error) {
        console.error("Hubo un problema al obtener los datos:", error);
      }
    }

    fetchData();
  }, []);

  const handleEstadoChange = (event) => {
    const selectedOptions = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    );
    setcajeroSeleccionado(selectedOptions);
  };

  const handleEstadoChange2 = (event) => {
    const selectedOptions = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    );
    setfechaSeleccionada(selectedOptions);
  };

  useEffect(() => {
    if (!ingresosPorCajero) return;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedToday = today.toISOString().split("T")[0];
    const formattedYesterday = yesterday.toISOString().split("T")[0];

    const filteredData = ingresosPorCajero.filter((factura) => {
      const fechaPago = new Date(factura.fecha_pago).toISOString().split("T")[0];
      return fechaSeleccionada.includes("Hoy")
        ? fechaPago === formattedToday
        : fechaPago === formattedYesterday;
    });

    // Filtrar por cajero seleccionado
    const filteredByCajero = filteredData.filter((factura) =>
      cajeroSeleccionado.includes(factura.cajero?.nombre)
    );

    const efectivoRecibido = filteredByCajero.filter((factura) =>
      factura.forma_pago?.nombre === "Efectivo en Oficina"
    );

    const totalEfectivoPorCajero = efectivoRecibido.reduce(
      (totalPorCajero, factura) => {
        const cajero = factura.cajero?.nombre;
        const total = factura.total;
        totalPorCajero[cajero] = (totalPorCajero[cajero] || 0) + total;
        return totalPorCajero;
      },
      {}
    );

    setTotalEfectivoPorCajero(totalEfectivoPorCajero);
  }, [cajeroSeleccionado, ingresosPorCajero, fechaSeleccionada]);

  return (
    <div>
      {showPasswordState ? (
        <>
          <h1>Inicia Sesión</h1>
          <LogingForm />
        </>
      ) : (
        <>
          <LogoTitulo />
          <DropdownMenu />
          <PageNav />

          <h3 className="h3">Ingresos por Cajero</h3>

          {/* Filtro para los cajeros */}
          <select
            id="cajeroSelect"
            size="5"
            multiple
            value={cajeroSeleccionado}
            onChange={handleEstadoChange}
          >
            <option value="Todos">Todos los Cajeros</option>
            <option value="Jose Gonzalez">Jose Gonzalez</option>
            <option value="georgina baladi">georgina baladi</option>
            <option value="Marlys Rodriguez">Marlys Rodriguez</option>
            <option value="Paola Guanipa">Paola Guanipa</option>
          </select>

          {/* Filtro para las fechas */}
          <select
            id="dia"
            size="5"
            multiple
            value={fechaSeleccionada}
            onChange={handleEstadoChange2}
          >
            <option value="Hoy">Hoy</option>
            <option value="Ayer">Ayer</option>
          </select>

          {/* Cargar los datos */}
          {isLoading ? (
            <div>Cargando...</div>
          ) : (
            <>
              {/* Total de Efectivo por Cajero */}
              <div>
                <h3>Total de Efectivo Recibido en Oficina</h3>
                <ul>
                  {Object.entries(totalEfectivoPorCajero).map(([cajero, total]) => (
                    <li key={cajero}>
                      {cajero}: {total !== undefined ? total : 0}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sección en construcción */}
              <div className="en-construccion">
                <h2>¡Esta sección está en construcción!</h2>
                <p>Estamos trabajando en la funcionalidad de administración. Vuelve pronto para más detalles.</p>
                <div className="icono-construccion">🚧</div>
              </div>

              {/* Ingresos por Cajero */}
              <h3>Ingresos por cajero</h3>
              <ul>
                {ingresosPorCajero.map((ingreso, index) => (
                  <li key={index}>
                    <p>Fecha de emisión: {ingreso.fecha_emision}</p>
                    <p>Fecha de pago: {ingreso.fecha_pago}</p>
                    <p>Total: {ingreso.total}</p>
                    <p>Forma de pago: {ingreso.forma_pago?.nombre}</p>
                    <p>Cajero: {ingreso.cajero?.nombre}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Admin;
